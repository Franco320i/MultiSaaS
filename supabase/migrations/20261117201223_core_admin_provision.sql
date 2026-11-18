-- =============================================================================
-- Alta asistida desde el panel central (diseño, secciones 9 y 10).
--
-- La creación del comercio pasa a una función común, private.create_tenant, que
-- usan las dos puertas:
--   - private.provision_tenant (autoservicio): exige email confirmado y retoma el
--     comercio si el usuario ya es dueño de uno (mismo comportamiento que antes).
--   - private.admin_provision_tenant (panel central): exige superadmin, permite un
--     dueño que todavía no aceptó la invitación y que ya tenga otros comercios, y deja
--     el alta auditada con el actor del panel central.
-- Además: private.user_id_by_email, para encontrar al dueño si ya tiene cuenta.
-- =============================================================================

create function private.create_tenant(
  p_owner_id uuid, p_input jsonb, p_root_domain text, p_actor_kind text, p_actor_id uuid
)
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
  v_tenant_id uuid := gen_random_uuid();
begin
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
    raise exception 'slug_taken' using errcode = 'P0001';
  end;

  insert into public.subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
  values (v_tenant_id, 'base', 'trialing', now(), now() + interval '14 days');

  insert into public.tenant_members (tenant_id, user_id, role, invited_by)
  values (v_tenant_id, p_owner_id, 'owner', case when p_actor_kind = 'platform_admin' then p_actor_id end);

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
          jsonb_build_object('business_type', v_template.key, 'assisted', p_actor_kind = 'platform_admin'),
          p_actor_kind, p_actor_id);

  insert into public.audit_log (tenant_id, actor_user_id, actor_kind, action, target_type, target_id, changes)
  values (v_tenant_id, p_actor_id, p_actor_kind, 'tenant.created', 'tenant', v_tenant_id::text,
          jsonb_build_object('slug', v_slug, 'business_type', v_template.key, 'owner', p_owner_id));

  return jsonb_build_object('tenant_id', v_tenant_id, 'slug', v_slug, 'created', true);
end;
$$;

-- Autoservicio: mismas reglas que en la etapa 8, ahora sobre la función común.
create or replace function private.provision_tenant(p_user_id uuid, p_input jsonb, p_root_domain text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_existing record;
begin
  if p_user_id is null or not private.user_is_confirmed(p_user_id) then
    raise exception 'user_not_confirmed' using errcode = 'P0001';
  end if;

  select t.id, t.slug into v_existing
  from public.tenant_members m
  join public.tenants t on t.id = m.tenant_id
  where m.user_id = p_user_id and m.role = 'owner' and t.status <> 'cancelled'
  order by t.created_at
  limit 1;
  if found then
    return jsonb_build_object('tenant_id', v_existing.id, 'slug', v_existing.slug, 'created', false);
  end if;

  return private.create_tenant(p_user_id, p_input, p_root_domain, 'owner', p_user_id);
end;
$$;

-- Panel central: superadmin, dueño invitado (puede no haber confirmado todavía).
create function private.admin_provision_tenant(p_actor uuid, p_owner_id uuid, p_input jsonb, p_root_domain text)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  perform private.assert_superadmin(p_actor);
  if p_owner_id is null or not private.user_exists(p_owner_id) then
    raise exception 'owner_not_found' using errcode = 'P0001';
  end if;
  return private.create_tenant(p_owner_id, p_input, p_root_domain, 'platform_admin', p_actor);
end;
$$;

-- service_role no lee auth.users: estas dos responden solo lo justo.
create function private.user_exists(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users u where u.id = p_user_id);
$$;

create function private.user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1;
$$;

revoke execute on function private.create_tenant(uuid, jsonb, text, text, uuid) from public, anon, authenticated;
revoke execute on function private.admin_provision_tenant(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function private.user_exists(uuid) from public, anon, authenticated;
revoke execute on function private.user_id_by_email(text) from public, anon, authenticated;
grant execute on function private.create_tenant(uuid, jsonb, text, text, uuid) to service_role;
grant execute on function private.admin_provision_tenant(uuid, uuid, jsonb, text) to service_role;
grant execute on function private.user_exists(uuid) to service_role;
grant execute on function private.user_id_by_email(text) to service_role;

create function public.admin_provision_tenant(p_actor uuid, p_owner_id uuid, p_input jsonb, p_root_domain text)
returns jsonb language sql volatile set search_path = ''
as $$ select private.admin_provision_tenant(p_actor, p_owner_id, p_input, p_root_domain); $$;

create function public.admin_user_id_by_email(p_email text)
returns uuid language sql stable set search_path = ''
as $$ select private.user_id_by_email(p_email); $$;

revoke execute on function public.admin_provision_tenant(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.admin_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.admin_provision_tenant(uuid, uuid, jsonb, text) to service_role;
grant execute on function public.admin_user_id_by_email(text) to service_role;

comment on function public.admin_provision_tenant(uuid, uuid, jsonb, text) is 'Solo service_role (alta asistida). Delegada en private.admin_provision_tenant.';
comment on function public.admin_user_id_by_email(text) is 'Solo service_role (alta asistida). Delegada en private.user_id_by_email.';
