-- =============================================================================
-- Capa 2 · RLS del módulo catálogo (categorías y productos)
-- Usa los datos de supabase/seed.sql (ver el encabezado de 01_rls_core.test.sql).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

-- =============================================================================
-- Anónimo: solo lo visible y publicado de comercios públicos
-- =============================================================================
select pg_temp.logout();
set local role anon;

select set_eq(
  'select slug from public.catalog_categories where tenant_id = ''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa''',
  array['hamburguesas', 'bebidas'],
  'anon: ve las categorías visibles de Alfa, no la oculta'
);
select set_eq(
  'select slug from public.catalog_products where tenant_id = ''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa''',
  array['hamburguesa-doble', 'hamburguesa-simple', 'gaseosa-500'],
  'anon: ve los productos publicados de Alfa (incluido el sin stock), no el borrador'
);
select is_empty(
  'select * from public.catalog_products where tenant_id = ''cccccccc-cccc-4ccc-8ccc-cccccccccccc''',
  'anon: no ve productos de un comercio suspendido'
);
select is_empty(
  'select * from public.catalog_categories where tenant_id = ''cccccccc-cccc-4ccc-8ccc-cccccccccccc''',
  'anon: no ve categorías de un comercio suspendido'
);
select throws_ok(
  $$ insert into public.catalog_products (tenant_id, name, slug, price)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Spam', 'spam', 1) $$,
  '42501', null, 'anon: no crea productos'
);
select throws_ok(
  $$ update public.catalog_products set price = 1 $$,
  '42501', null, 'anon: no edita precios'
);
select throws_ok(
  $$ delete from public.catalog_categories $$,
  '42501', null, 'anon: no borra categorías'
);

reset role;

-- =============================================================================
-- Staff de Alfa: CRUD completo dentro de Alfa
-- =============================================================================
select pg_temp.login('11111111-1111-4111-8111-111111111112');
set local role authenticated;

select results_eq(
  'select distinct tenant_id from public.catalog_products',
  $$ values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$,
  'staff Alfa: ve solo productos de Alfa'
);
select is((select count(*)::int from public.catalog_products), 4, 'staff Alfa: ve también el borrador');
select is((select count(*)::int from public.catalog_categories), 3, 'staff Alfa: ve también la categoría oculta');

select lives_ok(
  $$ insert into public.catalog_categories (tenant_id, name, slug)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Postres', 'postres') $$,
  'staff Alfa: crea una categoría en Alfa'
);
select lives_ok(
  $$ insert into public.catalog_products (tenant_id, category_id, name, slug, price)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1000000-0000-4000-8000-000000000002', 'Agua', 'agua', 150000) $$,
  'staff Alfa: crea un producto en Alfa'
);
with u as (
  update public.catalog_products set price = 950000
  where id = 'a2000000-0000-4000-8000-000000000001' returning 1
) select is(count(*)::int, 1, 'staff Alfa: edita el precio de un producto de Alfa') from u;

select throws_ok(
  $$ insert into public.catalog_products (tenant_id, name, slug, price)
     values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Intruso', 'intruso', 1) $$,
  '42501', null, 'staff Alfa: no crea productos en Beta'
);
select throws_ok(
  $$ insert into public.catalog_categories (tenant_id, name, slug)
     values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Intrusa', 'intrusa') $$,
  '42501', null, 'staff Alfa: no crea categorías en Beta'
);
with u as (
  update public.catalog_products set price = 1
  where tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1
) select is(count(*)::int, 0, 'staff Alfa: no edita productos de Beta') from u;
with d as (
  delete from public.catalog_products where tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1
) select is(count(*)::int, 0, 'staff Alfa: no borra productos de Beta') from d;
with d as (
  delete from public.catalog_categories where tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1
) select is(count(*)::int, 0, 'staff Alfa: no borra categorías de Beta') from d;

select throws_ok(
  $$ update public.catalog_products set tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
     where id = 'a2000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'staff Alfa: no puede mover un producto a otro comercio (sin permiso de columna)'
);
select throws_ok(
  $$ update public.catalog_products set category_id = 'b1000000-0000-4000-8000-000000000001'
     where id = 'a2000000-0000-4000-8000-000000000001' $$,
  '23503', null, 'staff Alfa: no puede asignar una categoría de Beta (FK compuesta)'
);
select throws_ok(
  $$ insert into public.catalog_products (tenant_id, category_id, name, slug, price)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'b1000000-0000-4000-8000-000000000001', 'Cruzado', 'cruzado', 1) $$,
  '23503', null, 'staff Alfa: no puede crear un producto en una categoría de Beta (FK compuesta)'
);

-- Borrar una categoría deja sus productos sin categoría (no los borra ni los cambia de comercio)
savepoint borrar_categoria;
delete from public.catalog_categories where id = 'a1000000-0000-4000-8000-000000000001';
select is(
  (select count(*)::int from public.catalog_products
   where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and category_id is null
     and slug in ('hamburguesa-doble', 'hamburguesa-simple', 'hamburguesa-vegana')),
  3, 'staff Alfa: al borrar una categoría, sus productos quedan sin categoría en Alfa'
);
rollback to savepoint borrar_categoria;

reset role;

-- =============================================================================
-- Dueña de Beta: no ve nada de Alfa, ni siquiera lo publicado (está logueada)
-- =============================================================================
select pg_temp.login('22222222-2222-4222-8222-222222222221');
set local role authenticated;

select is_empty(
  'select * from public.catalog_products where tenant_id = ''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa''',
  'dueña Beta: en el panel no ve productos de Alfa'
);
select is((select count(*)::int from public.catalog_products), 2, 'dueña Beta: ve sus 2 productos');

reset role;

-- =============================================================================
-- Usuario sin comercio
-- =============================================================================
select pg_temp.login('44444444-4444-4444-8444-444444444444');
set local role authenticated;

select is_empty('select * from public.catalog_products', 'sin comercio: no ve productos');
select is_empty('select * from public.catalog_categories', 'sin comercio: no ve categorías');
select throws_ok(
  $$ insert into public.catalog_products (tenant_id, name, slug, price)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'x-1', 1) $$,
  '42501', null, 'sin comercio: no crea productos'
);

reset role;

-- =============================================================================
-- Integridad (como postgres)
-- =============================================================================
select pg_temp.logout();

select throws_ok(
  $$ insert into public.catalog_categories (tenant_id, name, slug)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Otra', 'bebidas') $$,
  '23505', null, 'integridad: el slug de categoría es único dentro del comercio'
);
select lives_ok(
  $$ insert into public.catalog_categories (tenant_id, name, slug)
     values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Bebidas', 'bebidas') $$,
  'integridad: otro comercio puede usar el mismo slug'
);
select throws_ok(
  $$ insert into public.catalog_products (tenant_id, name, slug, price, compare_at_price)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Raro', 'raro', 1000, 500) $$,
  '23514', null, 'integridad: el precio "antes" tiene que ser mayor que el precio'
);
select throws_ok(
  $$ insert into public.catalog_products (tenant_id, name, slug, price)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Negativo', 'negativo', -1) $$,
  '23514', null, 'integridad: el precio no puede ser negativo'
);
select throws_ok(
  $$ insert into public.catalog_products (tenant_id, name, slug, price)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Slug malo', 'Slug Malo', 1) $$,
  '23514', null, 'integridad: el slug del producto tiene formato válido'
);

-- Límite del plan Base (150 productos): Beta tiene 2; se llena hasta 150 y el siguiente falla.
insert into public.catalog_products (tenant_id, name, slug, price)
select 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Relleno ' || g, 'relleno-' || g, 100
from generate_series(1, 148) as g;
select is(
  (select count(*)::int from public.catalog_products where tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  150, 'integridad: Beta llega a 150 productos'
);
select throws_ok(
  $$ insert into public.catalog_products (tenant_id, name, slug, price)
     values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'El 151', 'el-151', 100) $$,
  'P0001', null, 'integridad: el plan Base no admite el producto 151'
);
select lives_ok(
  $$ insert into public.catalog_products (tenant_id, name, slug, price)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Sin límite', 'sin-limite', 100) $$,
  'integridad: el plan Pro no tiene límite de productos'
);

select * from finish();
rollback;
