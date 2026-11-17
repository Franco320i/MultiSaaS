-- =============================================================================
-- Alta de comercios y publicación (diseño, sección 10).
--
--   public.slug_available(slug)            → ¿se puede usar este slug? (lista cerrada)
--   private.provision_tenant(usuario, ...) → crea un comercio completo en UNA transacción
--   private.set_tenant_published(...)      → publicar / despublicar el catálogo
--
-- provision_tenant y set_tenant_published las llama el servidor con la clave secreta
-- (alta de comercios, lista cerrada del diseño) a través de envoltorios public.*
-- SECURITY INVOKER que solo puede ejecutar service_role. El usuario y el comercio
-- los resuelve el servidor (sesión verificada / requireTenantAccess), nunca el navegador.
-- =============================================================================

-- "nuevo" es la ruta del asistente de alta en el panel (app.{dominio}/nuevo): un
-- comercio con ese slug quedaría tapado por esa pantalla. Mantener igual a RESERVED_SLUGS.
insert into public.reserved_slugs (slug) values ('nuevo') on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Slug para categorías iniciales: minúsculas, sin acentos, guiones.
-- -----------------------------------------------------------------------------
create function private.slugify(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    translate(lower(p_text), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
    '[^a-z0-9]+', '-', 'g'));
$$;
revoke execute on function private.slugify(text) from public, anon, authenticated;
grant execute on function private.slugify(text) to service_role;

-- -----------------------------------------------------------------------------
-- public.slug_available · verificación en vivo en el asistente (lista cerrada).
-- SECURITY DEFINER para consultar tenants sin dar SELECT sobre la tabla: devuelve
-- solo true/false, nunca datos de otro comercio. Solo usuarios con sesión.
-- -----------------------------------------------------------------------------
create function public.slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_slug is not null
    and p_slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
    and p_slug not like 'xn--%'
    and not exists (select 1 from public.reserved_slugs r where r.slug = p_slug)
    and not exists (select 1 from public.tenants t where t.slug = p_slug);
$$;

comment on function public.slug_available(text) is
  'Asistente de alta: true si el slug tiene formato válido, no está reservado y no lo usa otro comercio.';

revoke execute on function public.slug_available(text) from public, anon, authenticated;
grant execute on function public.slug_available(text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- ¿Existe el usuario y confirmó su email? service_role no tiene SELECT sobre
-- auth.users (y no se tocan los permisos del esquema auth): esta función responde
-- solo true/false. SECURITY DEFINER en private, ejecutable solo por service_role.
-- -----------------------------------------------------------------------------
create function private.user_is_confirmed(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users u where u.id = p_user_id and u.email_confirmed_at is not null);
$$;
revoke execute on function private.user_is_confirmed(uuid) from public, anon, authenticated;
grant execute on function private.user_is_confirmed(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- private.provision_tenant
--
-- p_user_id:     dueño (de la sesión verificada; el email tiene que estar confirmado)
-- p_input:       { name, slug, business_type, whatsapp_phone }
-- p_root_domain: dominio raíz del entorno (localhost, staging.tuapp.com.ar, tuapp.com.ar)
--
-- Crea: tenants (trial 14 días, sin publicar), subscriptions (trialing, plan base),
-- tenant_members (owner), domains ({slug}.{root} principal y activo), tenant_settings
-- (de la plantilla del rubro), tenant_modules (catalog y orders), categorías iniciales
-- del rubro, el evento tenant.created y su auditoría.
--
-- Si el usuario ya es dueño de un comercio, devuelve ese (created = false): el
-- asistente retoma donde quedó y un doble envío no crea dos comercios.
--
-- Errores (P0001, el mensaje es un código): user_not_confirmed, invalid_name,
-- invalid_slug, slug_taken, invalid_business_type, invalid_whatsapp, invalid_root_domain.
-- -----------------------------------------------------------------------------
create function private.provision_tenant(p_user_id uuid, p_input jsonb, p_root_domain text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_name      text := btrim(p_input ->> 'name');
  v_slug      text := lower(btrim(p_input ->> 'slug'));
  v_type      text := p_input ->> 'business_type';
  v_whatsapp  text := nullif(btrim(p_input ->> 'whatsapp_phone'), '');
  v_template  public.business_templates;
  v_existing  record;
  v_tenant_id uuid := gen_random_uuid();
begin
  if p_user_id is null or not private.user_is_confirmed(p_user_id) then
    raise exception 'user_not_confirmed' using errcode = 'P0001';
  end if;

  -- Ya es dueño: se retoma ese comercio.
  select t.id, t.slug into v_existing
  from public.tenant_members m
  join public.tenants t on t.id = m.tenant_id
  where m.user_id = p_user_id and m.role = 'owner' and t.status <> 'cancelled'
  order by t.created_at
  limit 1;
  if found then
    return jsonb_build_object('tenant_id', v_existing.id, 'slug', v_existing.slug, 'created', false);
  end if;

  if p_root_domain is null or p_root_domain !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$' then
    raise exception 'invalid_root_domain' using errcode = 'P0001';
  end if;
  if v_name is null or char_length(v_name) not between 2 and 80 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if v_slug is null or v_slug !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' or v_slug like 'xn--%'
     or exists (select 1 from public.reserved_slugs r where r.slug = v_slug) then
    raise exception 'invalid_slug' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.tenants t where t.slug = v_slug) then
    raise exception 'slug_taken' using errcode = 'P0001';
  end if;
  select * into v_template from public.business_templates b where b.key = v_type and b.is_active;
  if not found then
    raise exception 'invalid_business_type' using errcode = 'P0001';
  end if;
  if v_whatsapp is null or v_whatsapp !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'invalid_whatsapp' using errcode = 'P0001';
  end if;

  begin
    insert into public.tenants (id, slug, name, business_type, status, trial_ends_at)
    values (v_tenant_id, v_slug, v_name, v_template.key, 'trial', now() + interval '14 days');
  exception when unique_violation then
    -- Otro registro tomó el slug entre la verificación y el insert.
    raise exception 'slug_taken' using errcode = 'P0001';
  end;

  insert into public.subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
  values (v_tenant_id, 'base', 'trialing', now(), now() + interval '14 days');

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, p_user_id, 'owner');

  insert into public.domains (tenant_id, hostname, kind, is_primary, status, verified_at)
  values (v_tenant_id, v_slug || '.' || p_root_domain, 'subdomain', true, 'active', now());

  insert into public.tenant_settings (tenant_id, display_name, template_key, whatsapp_phone)
  values (v_tenant_id, v_name, v_template.key, v_whatsapp);

  insert into public.tenant_modules (tenant_id, module_key)
  select v_tenant_id, m.key from public.modules m where m.key in ('catalog', 'orders');

  insert into public.catalog_categories (tenant_id, name, slug, position)
  select v_tenant_id, c.name, private.slugify(c.name), c.ord
  from unnest(v_template.default_categories) with ordinality as c (name, ord)
  where private.slugify(c.name) <> '';

  insert into public.events (tenant_id, type, entity_type, entity_id, payload, actor_kind, actor_id)
  values (v_tenant_id, 'tenant.created', 'tenant', v_tenant_id,
          jsonb_build_object('business_type', v_template.key), 'owner', p_user_id);

  insert into public.audit_log (tenant_id, actor_user_id, actor_kind, action, target_type, target_id, changes)
  values (v_tenant_id, p_user_id, 'owner', 'tenant.created', 'tenant', v_tenant_id::text,
          jsonb_build_object('slug', v_slug, 'business_type', v_template.key));

  return jsonb_build_object('tenant_id', v_tenant_id, 'slug', v_slug, 'created', true);
end;
$$;

revoke execute on function private.provision_tenant(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function private.provision_tenant(uuid, jsonb, text) to service_role;

-- -----------------------------------------------------------------------------
-- private.set_tenant_published · publicar / despublicar.
-- Para publicar exige WhatsApp cargado y al menos un producto publicado (diseño,
-- sección 10). p_actor_id es el usuario verificado por requireTenantAccess con el
-- permiso catalog.publish. Errores: tenant_not_found, tenant_not_active,
-- missing_whatsapp, no_products.
-- -----------------------------------------------------------------------------
create function private.set_tenant_published(p_tenant_id uuid, p_actor_id uuid, p_published boolean)
returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  v_tenant public.tenants;
  v_role   text;
begin
  select * into v_tenant from public.tenants t where t.id = p_tenant_id for update;
  if not found then
    raise exception 'tenant_not_found' using errcode = 'P0001';
  end if;
  if v_tenant.status in ('suspended', 'cancelled') then
    raise exception 'tenant_not_active' using errcode = 'P0001';
  end if;

  select m.role into v_role from public.tenant_members m
  where m.tenant_id = p_tenant_id and m.user_id = p_actor_id;

  if p_published then
    if v_tenant.published_at is not null then
      return v_tenant.published_at;
    end if;
    if not exists (select 1 from public.tenant_settings s
                   where s.tenant_id = p_tenant_id and s.whatsapp_phone is not null) then
      raise exception 'missing_whatsapp' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.catalog_products p
                   where p.tenant_id = p_tenant_id and p.is_published) then
      raise exception 'no_products' using errcode = 'P0001';
    end if;
    update public.tenants set published_at = now() where id = p_tenant_id
    returning published_at into v_tenant.published_at;
  else
    if v_tenant.published_at is null then
      return null;
    end if;
    update public.tenants set published_at = null where id = p_tenant_id;
    v_tenant.published_at := null;
  end if;

  insert into public.events (tenant_id, type, entity_type, entity_id, payload, actor_kind, actor_id)
  values (p_tenant_id, case when p_published then 'tenant.published' else 'tenant.unpublished' end,
          'tenant', p_tenant_id, '{}'::jsonb, coalesce(v_role, 'system'), p_actor_id);

  insert into public.audit_log (tenant_id, actor_user_id, actor_kind, action, target_type, target_id)
  values (p_tenant_id, p_actor_id, coalesce(v_role, 'system'),
          case when p_published then 'tenant.published' else 'tenant.unpublished' end,
          'tenant', p_tenant_id::text);

  return v_tenant.published_at;
end;
$$;

revoke execute on function private.set_tenant_published(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function private.set_tenant_published(uuid, uuid, boolean) to service_role;

-- -----------------------------------------------------------------------------
-- Puertas para el servidor (mismo criterio que public.create_order).
-- -----------------------------------------------------------------------------
create function public.provision_tenant(p_user_id uuid, p_input jsonb, p_root_domain text)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select private.provision_tenant(p_user_id, p_input, p_root_domain);
$$;

create function public.set_tenant_published(p_tenant_id uuid, p_actor_id uuid, p_published boolean)
returns timestamptz
language sql
volatile
set search_path = ''
as $$
  select private.set_tenant_published(p_tenant_id, p_actor_id, p_published);
$$;

comment on function public.provision_tenant(uuid, jsonb, text) is 'Solo service_role (alta de comercios). Delegada en private.provision_tenant.';
comment on function public.set_tenant_published(uuid, uuid, boolean) is 'Solo service_role (publicar). Delegada en private.set_tenant_published.';

revoke execute on function public.provision_tenant(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.set_tenant_published(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.provision_tenant(uuid, jsonb, text) to service_role;
grant execute on function public.set_tenant_published(uuid, uuid, boolean) to service_role;
