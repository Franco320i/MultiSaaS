-- =============================================================================
-- Capa 2 · Catálogo público: public.storefront_by_host (diseño, secciones 5 y 7)
-- Usa los datos de supabase/seed.sql. Es la única puerta anónima a los datos del
-- comercio: se prueba qué devuelve, qué NO devuelve y para quién.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Preparación (como dueño de la base): un dominio pendiente y un comercio sin publicar.
insert into public.domains (tenant_id, hostname, kind, is_primary, status)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pendiente.example.com', 'custom', false, 'pending');
update public.tenants set published_at = null where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

select pg_temp.logout();
set local role anon;

-- -----------------------------------------------------------------------------
-- Comercio público
-- -----------------------------------------------------------------------------
select is(
  public.storefront_by_host('alfa.localhost') ->> 'available', 'true',
  'anon: Alfa (activo y publicado) está disponible'
);
select is(
  public.storefront_by_host('alfa.localhost') ->> 'tenant_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'anon: el host de Alfa resuelve al comercio Alfa'
);
select is(
  public.storefront_by_host('ALFA.localhost') ->> 'display_name', 'Burger Alfa',
  'anon: el host no distingue mayúsculas'
);
select is(
  public.storefront_by_host('alfa.localhost') -> 'theme' ->> 'brand', '#c2410c',
  'anon: sin color propio, el comercio hereda el de su plantilla'
);
select is(
  jsonb_array_length(public.storefront_by_host('alfa.localhost') -> 'hours'), 6,
  'anon: vienen los horarios del comercio (martes a domingo)'
);
select is(
  public.storefront_by_host('alfa.localhost') -> 'hours' -> 0 ->> 'closes_at', '00:30',
  'anon: los horarios vienen como HH:MM'
);

-- Nada interno: ni estado, ni motivo, ni plan, ni miembros.
select is_empty(
  $$ select k from jsonb_object_keys(public.storefront_by_host('alfa.localhost')) as k
     where k not in ('available', 'tenant_id', 'slug', 'display_name', 'tagline', 'description',
                     'logo_path', 'cover_path', 'theme', 'template_key', 'whatsapp_phone',
                     'instagram', 'address', 'city', 'currency', 'timezone', 'accepts_pickup',
                     'accepts_delivery', 'delivery_fee', 'min_order_amount', 'open_mode',
                     'closed_message', 'payment_methods', 'highlights', 'hours') $$,
  'anon: solo se devuelven campos públicos (lista cerrada)'
);

-- -----------------------------------------------------------------------------
-- Comercios no públicos: solo "no disponible", sin ningún dato
-- -----------------------------------------------------------------------------
select is(
  public.storefront_by_host('gamma.localhost'), '{"available": false}'::jsonb,
  'anon: Gamma (suspendido) no está disponible y no devuelve datos'
);
select is(
  public.storefront_by_host('beta.localhost'), '{"available": false}'::jsonb,
  'anon: un comercio sin publicar no está disponible y no devuelve datos'
);

-- -----------------------------------------------------------------------------
-- Hosts que no resuelven
-- -----------------------------------------------------------------------------
select is(public.storefront_by_host('nadie.localhost'), null, 'anon: host desconocido → null');
select is(public.storefront_by_host('pendiente.example.com'), null, 'anon: dominio pendiente → null');
select is(public.storefront_by_host(''), null, 'anon: host vacío → null');
select is(public.storefront_by_host(repeat('a', 300)), null, 'anon: host demasiado largo → null');
select is(public.storefront_by_host(null), null, 'anon: host nulo → null');

-- -----------------------------------------------------------------------------
-- Sigue sin poder leer las tablas que la función esconde
-- -----------------------------------------------------------------------------
select throws_ok('select * from public.tenants', '42501', null, 'anon: no lee tenants');
select throws_ok('select * from public.domains', '42501', null, 'anon: no lee domains');
select throws_ok('select * from public.tenant_settings', '42501', null, 'anon: no lee tenant_settings');
select throws_ok('select * from public.business_hours', '42501', null, 'anon: no lee business_hours');

-- -----------------------------------------------------------------------------
-- Usuario con sesión: misma respuesta pública (el catálogo no depende de quién mira)
-- -----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', '44444444-4444-4444-8444-444444444444', 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  public.storefront_by_host('alfa.localhost') ->> 'display_name', 'Burger Alfa',
  'sin comercio: ve el catálogo público de Alfa'
);
select is(
  public.storefront_by_host('gamma.localhost'), '{"available": false}'::jsonb,
  'sin comercio: Gamma sigue no disponible'
);

select * from finish();
rollback;
