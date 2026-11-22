-- =============================================================================
-- Catálogo nuevo, parte 2 (docs/superpowers/specs/2026-11-22-catalogo-nuevo-design.md)
--
-- tenant_settings: payment_methods (lista fija) y highlights ("Todos los pedidos incluyen",
--   hasta 4 frases de 1 a 60 letras). Solo el dueño las cambia (política existente).
-- catalog_products: tags (lista fija, hasta 3, sin repetir; "Oferta" es automática y no se
--   guarda) y specs (características: lista de hasta 8 {label 1-30, value 1-60}).
--   Dueño y staff, como el resto del producto.
-- storefront_by_host: misma firma, devuelve además payment_methods y highlights.
-- Las listas coinciden con src/lib/catalog-options.ts.
-- =============================================================================

-- Funciones de validación para los CHECK: puras, sin acceso a tablas.
create function private.texts_fit(p_items text[], p_max_items integer, p_max_len integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(cardinality(p_items), 0) <= p_max_items
     and not exists (
       select 1 from unnest(p_items) as t(v)
       where v is null or char_length(btrim(v)) = 0 or char_length(v) > p_max_len
     );
$$;

create function private.distinct_texts(p_items text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (select count(distinct v) from unnest(p_items) as t(v)) = coalesce(cardinality(p_items), 0);
$$;

create function private.specs_valid(p_specs jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_specs) = 'array'
     and jsonb_array_length(p_specs) <= 8
     and not exists (
       select 1 from jsonb_array_elements(p_specs) as e(item)
       where jsonb_typeof(item) <> 'object'
          or jsonb_typeof(item -> 'label') is distinct from 'string'
          or jsonb_typeof(item -> 'value') is distinct from 'string'
          or char_length(btrim(item ->> 'label')) not between 1 and 30
          or char_length(item ->> 'label') > 30
          or char_length(btrim(item ->> 'value')) not between 1 and 60
          or char_length(item ->> 'value') > 60
          or (select count(*) from jsonb_object_keys(item)) <> 2
     );
$$;

-- Las usan los CHECK al escribir con la sesión del usuario.
revoke execute on function private.texts_fit(text[], integer, integer) from public;
revoke execute on function private.distinct_texts(text[]) from public;
revoke execute on function private.specs_valid(jsonb) from public;
grant execute on function private.texts_fit(text[], integer, integer) to authenticated, service_role;
grant execute on function private.distinct_texts(text[]) to authenticated, service_role;
grant execute on function private.specs_valid(jsonb) to authenticated, service_role;

alter table public.tenant_settings
  add column payment_methods text[] not null default '{}'
    check (payment_methods <@ array['efectivo', 'transferencia', 'mercado_pago', 'debito', 'credito']
           and private.distinct_texts(payment_methods)),
  add column highlights text[] not null default '{}'
    check (private.texts_fit(highlights, 4, 60));

alter table public.catalog_products
  add column tags text[] not null default '{}'
    check (tags <@ array['nuevo', 'ultimas_unidades', 'vegetariano', 'vegano', 'sin_tacc', 'picante']
           and cardinality(tags) <= 3
           and private.distinct_texts(tags)),
  add column specs jsonb not null default '[]'::jsonb
    check (private.specs_valid(specs));

grant update (payment_methods, highlights) on public.tenant_settings to authenticated;
grant insert (tags, specs) on public.catalog_products to authenticated;
grant update (tags, specs) on public.catalog_products to authenticated;

-- Misma firma y mismos permisos: create or replace los conserva.
create or replace function public.storefront_by_host(p_host text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when not private.tenant_is_public(t.id) then jsonb_build_object('available', false)
      else jsonb_build_object(
        'available',        true,
        'tenant_id',        t.id,
        'slug',             t.slug,
        'display_name',     s.display_name,
        'tagline',          s.tagline,
        'description',      s.description,
        'logo_path',        s.logo_path,
        'cover_path',       s.cover_path,
        -- La plantilla pone los valores por defecto; lo del comercio pisa.
        'theme',            coalesce(bt.default_theme, '{}'::jsonb) || s.theme,
        'template_key',     s.template_key,
        'whatsapp_phone',   s.whatsapp_phone,
        'instagram',        s.instagram,
        'address',          s.address,
        'city',             s.city,
        'currency',         s.currency,
        'timezone',         s.timezone,
        'accepts_pickup',   s.accepts_pickup,
        'accepts_delivery', s.accepts_delivery,
        'delivery_fee',     s.delivery_fee,
        'min_order_amount', s.min_order_amount,
        'open_mode',        s.open_mode,
        'closed_message',   s.closed_message,
        'payment_methods',  to_jsonb(s.payment_methods),
        'highlights',       to_jsonb(s.highlights),
        'hours', coalesce((
          select jsonb_agg(
                   jsonb_build_object(
                     'weekday',   h.weekday,
                     'opens_at',  to_char(h.opens_at, 'HH24:MI'),
                     'closes_at', to_char(h.closes_at, 'HH24:MI'))
                   order by h.weekday, h.opens_at)
          from public.business_hours h
          where h.tenant_id = t.id
        ), '[]'::jsonb)
      )
    end
  from public.domains d
  join public.tenants t on t.id = d.tenant_id
  join public.tenant_settings s on s.tenant_id = t.id
  left join public.business_templates bt on bt.key = s.template_key
  where char_length(p_host) <= 253
    and d.hostname = lower(p_host)
    and d.status = 'active';
$$;
