-- =============================================================================
-- Capa 2 · Alta de comercios y publicación (diseño, sección 10)
--   public.slug_available · private.admin_provision_tenant (alta asistida; el autoservicio
--   se quitó en el rediseño 11e) · private.set_tenant_published
-- Usa supabase/seed.sql: sin.comercio@example.com (4444…) es un usuario confirmado
-- sin comercio y admin@example.com (5555…) es superadmin. En la prueba se crea además otro
-- usuario confirmado.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000', '66666666-6666-4666-8666-666666666661', 'authenticated', 'authenticated',
   'otra.persona@example.com', '', now(), '{}', '{}', now(), now(), '', '', '', '');

create function pg_temp.input(p_slug text, p_extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('name', 'Nuevo Local', 'slug', p_slug, 'business_type', 'gastronomia',
                            'whatsapp_phone', '+5492954000099') || p_extra;
$$;

-- =============================================================================
-- slug_available
-- =============================================================================
select is(private.slugify('Sin TACC'), 'sin-tacc', 'slugify: espacios y mayúsculas');
select is(private.slugify('Panadería & Café'), 'panaderia-cafe', 'slugify: acentos y símbolos');

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok($$ select public.slug_available('nuevo-local') $$, '42501', null, 'anon: no consulta slugs');
select throws_ok($$ select public.admin_provision_tenant('55555555-5555-4555-8555-555555555555', '44444444-4444-4444-8444-444444444444', '{}', 'localhost') $$,
                 '42501', null, 'anon: no crea comercios');

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', '44444444-4444-4444-8444-444444444444', 'role', 'authenticated')::text, true);
set local role authenticated;

select ok(public.slug_available('nuevo-local'), 'slug libre');
select ok(not public.slug_available('alfa'), 'slug de otro comercio');
select ok(not public.slug_available('app'), 'slug reservado');
select ok(not public.slug_available('Mal Slug'), 'slug con formato inválido');
select ok(not public.slug_available('xn--abc'), 'slug punycode');
select ok(not public.slug_available('ab'), 'slug demasiado corto');
select throws_ok(
  $$ select public.admin_provision_tenant('55555555-5555-4555-8555-555555555555', '44444444-4444-4444-8444-444444444444', pg_temp.input('nuevo-local'), 'localhost') $$,
  '42501', null, 'authenticated: no puede crear comercios salteando el servidor'
);
select throws_ok(
  $$ select public.set_tenant_published('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', false) $$,
  '42501', null, 'authenticated: no puede publicar o despublicar salteando el servidor'
);

-- =============================================================================
-- admin_provision_tenant (como el servidor del panel central)
-- =============================================================================
reset role;
set local role service_role;

select is(
  public.admin_provision_tenant('55555555-5555-4555-8555-555555555555', '44444444-4444-4444-8444-444444444444', pg_temp.input('nuevo-local'), 'localhost') - 'tenant_id',
  '{"slug": "nuevo-local", "created": true}'::jsonb,
  'crea el comercio'
);

reset role;
create temp table nuevo on commit drop as
  select id from public.tenants where slug = 'nuevo-local';
grant select on nuevo to service_role, authenticated;

select is(
  (select status || ' ' || (published_at is null)::text || ' ' || (trial_ends_at::date - now()::date)::text
   from public.tenants where id = (select id from nuevo)),
  'trial true 14',
  'tenants: en prueba por 14 días y sin publicar'
);
select is(
  (select role from public.tenant_members where tenant_id = (select id from nuevo)
   and user_id = '44444444-4444-4444-8444-444444444444'),
  'owner', 'tenant_members: el usuario es dueño'
);
select is(
  (select hostname || ' ' || kind || ' ' || status || ' ' || is_primary::text from public.domains
   where tenant_id = (select id from nuevo)),
  'nuevo-local.localhost subdomain active true', 'domains: subdominio principal y activo'
);
select is(
  (select display_name || ' ' || template_key || ' ' || whatsapp_phone from public.tenant_settings
   where tenant_id = (select id from nuevo)),
  'Nuevo Local gastronomia +5492954000099', 'tenant_settings: datos del paso 1 y plantilla del rubro'
);
select set_eq(
  $$ select module_key from public.tenant_modules where tenant_id = (select id from nuevo) $$,
  array['catalog', 'orders'], 'tenant_modules: catálogo y pedidos'
);
select is(
  (select plan_id || ' ' || status from public.subscriptions where tenant_id = (select id from nuevo)),
  'base trialing', 'subscriptions: prueba sobre el plan Base'
);
select results_eq(
  $$ select slug from public.catalog_categories where tenant_id = (select id from nuevo) order by position $$,
  array['destacados', 'principales', 'bebidas', 'postres'],
  'catalog_categories: las del rubro, en orden'
);
select is(
  (select count(*)::int from public.events where tenant_id = (select id from nuevo) and type = 'tenant.created'),
  1, 'events: tenant.created'
);
select is(
  (select count(*)::int from public.audit_log where tenant_id = (select id from nuevo) and action = 'tenant.created'
   and actor_user_id = '55555555-5555-4555-8555-555555555555' and actor_kind = 'platform_admin'),
  1, 'audit_log: alta registrada con el superadmin'
);
select is(
  public.storefront_by_host('nuevo-local.localhost'), '{"available": false}'::jsonb,
  'sin publicar, el catálogo no está disponible'
);

-- El dueño nuevo ve su comercio con su sesión (RLS).
select set_config('request.jwt.claims',
  json_build_object('sub', '44444444-4444-4444-8444-444444444444', 'role', 'authenticated')::text, true);
set local role authenticated;
select set_eq('select slug from public.tenants', array['nuevo-local'], 'el dueño nuevo ve su comercio y ningún otro');
select ok(not public.slug_available('nuevo-local'), 'el slug ya no está disponible');

-- Errores
reset role;
set local role service_role;
select throws_ok(
  $$ select public.admin_provision_tenant('55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666661', pg_temp.input('alfa'), 'localhost') $$,
  'P0001', 'slug_taken', 'slug de otro comercio'
);
select throws_ok(
  $$ select public.admin_provision_tenant('55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666661', pg_temp.input('admin'), 'localhost') $$,
  'P0001', 'invalid_slug', 'slug reservado'
);
select throws_ok(
  $$ select public.admin_provision_tenant('55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666661', pg_temp.input('Mal Slug'), 'localhost') $$,
  'P0001', 'invalid_slug', 'slug con formato inválido'
);
select throws_ok(
  $$ select public.admin_provision_tenant('55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666661',
       pg_temp.input('otra-cosa', '{"whatsapp_phone": "2954 1234"}'), 'localhost') $$,
  'P0001', 'invalid_whatsapp', 'WhatsApp sin formato internacional'
);
select throws_ok(
  $$ select public.admin_provision_tenant('55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666661',
       pg_temp.input('otra-cosa', '{"business_type": "casino"}'), 'localhost') $$,
  'P0001', 'invalid_business_type', 'rubro inexistente'
);
select throws_ok(
  $$ select public.admin_provision_tenant('55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666661',
       pg_temp.input('otra-cosa', '{"name": "X"}'), 'localhost') $$,
  'P0001', 'invalid_name', 'nombre demasiado corto'
);
select throws_ok(
  $$ select public.admin_provision_tenant('55555555-5555-4555-8555-555555555555', '9a000000-0000-4000-8000-000000000000', pg_temp.input('otra-cosa'), 'localhost') $$,
  'P0001', 'owner_not_found', 'dueño inexistente'
);
select throws_ok(
  $$ select public.admin_provision_tenant('44444444-4444-4444-8444-444444444444', '66666666-6666-4666-8666-666666666661', pg_temp.input('otra-cosa'), 'localhost') $$,
  'P0001', 'not_superadmin', 'solo un superadmin da de alta comercios'
);
select is(
  (select count(*)::int from pg_proc where proname = 'provision_tenant'), 0,
  'el alta por autoservicio ya no existe en la base'
);
select throws_ok(
  $$ select public.admin_provision_tenant('55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666661', pg_temp.input('otra-cosa'), 'local host') $$,
  'P0001', 'invalid_root_domain', 'dominio raíz inválido'
);

-- =============================================================================
-- set_tenant_published
-- =============================================================================
select throws_ok(
  $$ select public.set_tenant_published((select id from nuevo), '44444444-4444-4444-8444-444444444444', true) $$,
  'P0001', 'no_products', 'no se publica sin productos publicados'
);

reset role;
insert into public.catalog_products (tenant_id, name, slug, price, is_published)
select id, 'Milanesa', 'milanesa', 800000, true from nuevo;
set local role service_role;

select isnt(
  public.set_tenant_published((select id from nuevo), '44444444-4444-4444-8444-444444444444', true), null,
  'con WhatsApp y un producto publicado, se publica'
);
select is(
  public.storefront_by_host('nuevo-local.localhost') ->> 'display_name', 'Nuevo Local',
  'publicado, el catálogo está disponible'
);
select is(
  public.set_tenant_published((select id from nuevo), '44444444-4444-4444-8444-444444444444', false), null,
  'se despublica'
);
select is(
  public.storefront_by_host('nuevo-local.localhost'), '{"available": false}'::jsonb,
  'despublicado, vuelve a no estar disponible'
);
reset role;
select is(
  (select string_agg(type || ':' || actor_kind, ',' order by id) from public.events
   where tenant_id = (select id from nuevo) and type like 'tenant.%published'),
  'tenant.published:owner,tenant.unpublished:owner',
  'events: publicar y despublicar, con el rol del usuario'
);

update public.tenant_settings set whatsapp_phone = null where tenant_id = (select id from nuevo);
set local role service_role;
select throws_ok(
  $$ select public.set_tenant_published((select id from nuevo), '44444444-4444-4444-8444-444444444444', true) $$,
  'P0001', 'missing_whatsapp', 'no se publica sin WhatsApp'
);
select throws_ok(
  $$ select public.set_tenant_published('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333331', true) $$,
  'P0001', 'tenant_not_active', 'un comercio suspendido no se publica'
);

select * from finish();
rollback;
