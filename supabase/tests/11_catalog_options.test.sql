-- =============================================================================
-- Capa 2 · Opciones del producto (parte 3): catalog_option_groups y catalog_options
-- (docs/superpowers/specs/2026-11-23-opciones-producto-design.md)
-- Seed: Alfa "Hamburguesa a elección" (a2…05) con Tamaño (obligatorio, una: Simple, Doble +1.500)
-- y Extras (opcional, hasta 2: Panceta +800, Huevo +500 agotado).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

create temp table k (name text primary key, id uuid) on commit drop;
insert into k values
  ('alfa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('beta', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('owner', '11111111-1111-4111-8111-111111111111'),
  ('staff', '11111111-1111-4111-8111-111111111112'),
  ('ownerBeta', '22222222-2222-4222-8222-222222222221'),
  ('nobody', '44444444-4444-4444-8444-444444444444'),
  ('doble', 'a2000000-0000-4000-8000-000000000005'),
  ('simpleProd', 'a2000000-0000-4000-8000-000000000002'),
  ('remera', 'b2000000-0000-4000-8000-000000000001'),
  ('tamano', 'a4000000-0000-4000-8000-000000000001'),
  ('extras', 'a4000000-0000-4000-8000-000000000002');
grant select on k to anon, authenticated;
create function pg_temp.k(p text) returns uuid language sql as $$ select id from k where name = p $$;

-- -----------------------------------------------------------------------------
-- Lectura
-- -----------------------------------------------------------------------------
set local role anon;
select pg_temp.logout();
select is((select count(*)::int from public.catalog_option_groups where product_id = pg_temp.k('doble')), 2,
          'anónimo: ve los grupos de un producto publicado de un comercio público');
select is((select count(*)::int from public.catalog_options o
           join public.catalog_option_groups g on g.tenant_id = o.tenant_id and g.id = o.group_id
           where g.product_id = pg_temp.k('doble')), 4, 'anónimo: ve sus opciones (también las agotadas)');
reset role;

update public.catalog_products set is_published = false where id = pg_temp.k('doble');
set local role anon;
select is((select count(*)::int from public.catalog_option_groups where product_id = pg_temp.k('doble')), 0,
          'anónimo: no ve las opciones de un producto oculto');
select is((select count(*)::int from public.catalog_options where group_id = pg_temp.k('tamano')), 0,
          'anónimo: tampoco las opciones sueltas de un producto oculto');
reset role;
update public.catalog_products set is_published = true where id = pg_temp.k('doble');

set local role authenticated;
select pg_temp.login(pg_temp.k('ownerBeta'));
select is((select count(*)::int from public.catalog_option_groups where tenant_id = pg_temp.k('alfa')), 0,
          'otro comercio: no ve los grupos de Alfa (ni de productos publicados)');
select pg_temp.login(pg_temp.k('nobody'));
select is((select count(*)::int from public.catalog_options where tenant_id = pg_temp.k('alfa')), 0,
          'sin comercio: no ve las opciones de Alfa');

-- -----------------------------------------------------------------------------
-- Escritura
-- -----------------------------------------------------------------------------
select pg_temp.login(pg_temp.k('staff'));
select lives_ok($$
  insert into public.catalog_option_groups (tenant_id, product_id, name, required, max_choices, position)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000002', 'Punto', true, 1, 1) $$,
  'staff: crea un grupo en un producto de su comercio');
select lives_ok($$
  update public.catalog_options set is_available = true, price_delta = 600
  where id = 'a5000000-0000-4000-8000-000000000004' $$, 'staff: marca una opción como disponible y cambia su precio');

select pg_temp.login(pg_temp.k('ownerBeta'));
select throws_ok($$
  insert into public.catalog_option_groups (tenant_id, product_id, name, required, max_choices)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000005', 'Hackeo', false, 1) $$,
  '42501', null, 'otro comercio: no crea grupos en Alfa');
with u as (update public.catalog_options set price_delta = 0 where tenant_id = pg_temp.k('alfa') returning 1)
select is((select count(*)::int from u), 0, 'otro comercio: no cambia precios de opciones de Alfa');
with d as (delete from public.catalog_option_groups where tenant_id = pg_temp.k('alfa') returning 1)
select is((select count(*)::int from d), 0, 'otro comercio: no borra grupos de Alfa');
-- Un grupo de Beta colgado de un producto de Alfa: lo frena la FK compuesta.
select throws_ok($$
  insert into public.catalog_option_groups (tenant_id, product_id, name, required, max_choices)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'a2000000-0000-4000-8000-000000000005', 'Cruce', false, 1) $$,
  '23503', null, 'un grupo no puede apuntar a un producto de otro comercio');
reset role;

-- -----------------------------------------------------------------------------
-- Integridad
-- -----------------------------------------------------------------------------
select throws_ok($$ insert into public.catalog_option_groups (tenant_id, product_id, name, required, max_choices)
                    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000003', '', false, 1) $$,
                 '23514', null, 'grupo sin nombre');
select throws_ok($$ insert into public.catalog_option_groups (tenant_id, product_id, name, required, max_choices)
                    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000003', 'Cero', false, 0) $$,
                 '23514', null, 'max_choices fuera de 1 a 20');
select throws_ok($$ insert into public.catalog_options (tenant_id, group_id, name, price_delta)
                    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a4000000-0000-4000-8000-000000000002', 'Resta', -100) $$,
                 '23514', null, 'una opción no puede restar precio');
select throws_ok($$ insert into public.catalog_options (tenant_id, group_id, name, price_delta)
                    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'a4000000-0000-4000-8000-000000000002', 'Cruce', 0) $$,
                 '23503', null, 'una opción no puede apuntar a un grupo de otro comercio');
select throws_ok($$ update public.catalog_option_groups set tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
                    where id = 'a4000000-0000-4000-8000-000000000001' $$,
                 null, null, 'el comercio de un grupo no se puede cambiar');

-- Límite: 5 grupos por producto (Hamburguesa doble ya tiene 2).
insert into public.catalog_option_groups (tenant_id, product_id, name, required, max_choices)
select pg_temp.k('alfa'), pg_temp.k('doble'), 'Extra ' || g, false, 1 from generate_series(1, 3) g;
select throws_ok($$ insert into public.catalog_option_groups (tenant_id, product_id, name, required, max_choices)
                    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000005', 'Sexto', false, 1) $$,
                 'P0001', null, 'hasta 5 grupos por producto');

-- Límite: 20 opciones por grupo (Extras ya tiene 2).
insert into public.catalog_options (tenant_id, group_id, name, price_delta)
select pg_temp.k('alfa'), pg_temp.k('extras'), 'Opción ' || g, 0 from generate_series(1, 18) g;
select throws_ok($$ insert into public.catalog_options (tenant_id, group_id, name, price_delta)
                    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a4000000-0000-4000-8000-000000000002', 'Veintiuno', 0) $$,
                 'P0001', null, 'hasta 20 opciones por grupo');

-- Borrar el producto borra sus grupos y opciones.
delete from public.order_items where product_id = pg_temp.k('doble');
delete from public.catalog_products where id = pg_temp.k('doble');
select is((select count(*)::int from public.catalog_option_groups where product_id = pg_temp.k('doble')), 0,
          'al borrar el producto se borran sus grupos');
select is((select count(*)::int from public.catalog_options where group_id = pg_temp.k('tamano')), 0,
          'y sus opciones');

select * from finish();
rollback;
