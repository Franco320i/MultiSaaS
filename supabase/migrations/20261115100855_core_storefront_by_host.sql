-- =============================================================================
-- Catálogo público: resolver host → comercio (diseño, secciones 5 y 7).
--
-- public.storefront_by_host es la ÚNICA forma anónima de pasar de un host a un
-- comercio. Evita dar SELECT a anon sobre tenants, domains, tenant_settings y
-- business_hours: devuelve solo campos públicos, armados acá.
--
--   - host desconocido o dominio no activo        → null (la página responde 404)
--   - comercio suspendido, cancelado o sin publicar → {"available": false} sin
--     ningún otro dato (la página muestra "Catálogo no disponible")
--   - comercio público                             → sus datos públicos y horarios
--
-- Está en la lista cerrada de funciones SECURITY DEFINER permitidas en public
-- (00_schema.test.sql).
-- =============================================================================

-- Color de marca por defecto de cada plantilla (docs/design/sistema-visual.md).
-- El comercio lo pisa con tenant_settings.theme.brand.
update public.business_templates set default_theme = jsonb_build_object('brand', v.brand)
from (values
  ('gastronomia',  '#c2410c'),
  ('indumentaria', '#9d174d'),
  ('tecnologia',   '#1d4ed8'),
  ('dietetica',    '#4d7c0f'),
  ('general',      '#334155')
) as v (key, brand)
where business_templates.key = v.key;

create function public.storefront_by_host(p_host text)
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

comment on function public.storefront_by_host(text) is
  'Catálogo público: datos públicos del comercio de un host. null = host desconocido; {"available": false} = comercio no público.';

revoke execute on function public.storefront_by_host(text) from public, anon, authenticated;
grant execute on function public.storefront_by_host(text) to anon, authenticated;
