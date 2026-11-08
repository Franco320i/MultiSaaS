-- =============================================================================
-- Capa 2 · RLS de fotos de productos y de Storage (bucket catalog-public)
-- Usa los datos de supabase/seed.sql.
--   Alfa: foto del producto publicado (a3…01) y del borrador (a3…02)
--   Beta: foto de la remera (b3…01) · Gamma (suspendido): c3…01
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
-- Tabla catalog_product_images
-- =============================================================================

-- Anónimo: solo fotos de productos publicados de comercios públicos
select pg_temp.logout();
set local role anon;

select set_eq(
  'select id from public.catalog_product_images',
  array['a3000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001']::uuid[],
  'anon: ve las fotos de productos publicados de Alfa y Beta; no la del borrador ni la de Gamma (suspendido)'
);
select throws_ok(
  $$ insert into public.catalog_product_images (id, tenant_id, product_id, storage_path, width, height)
     values ('a3000000-0000-4000-8000-0000000000ff', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000001',
             'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/products/a2000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-0000000000ff', 10, 10) $$,
  '42501', null, 'anon: no agrega fotos'
);
select throws_ok('delete from public.catalog_product_images', '42501', null, 'anon: no borra fotos');

reset role;

-- Staff de Alfa
select pg_temp.login('11111111-1111-4111-8111-111111111112');
set local role authenticated;

select set_eq(
  'select id from public.catalog_product_images',
  array['a3000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002']::uuid[],
  'staff Alfa: ve las fotos de Alfa (incluida la del borrador) y ninguna de Beta'
);
select lives_ok(
  $$ insert into public.catalog_product_images (id, tenant_id, product_id, storage_path, width, height, position)
     values ('a3000000-0000-4000-8000-000000000010', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000001',
             'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/products/a2000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-000000000010', 800, 600, 2) $$,
  'staff Alfa: agrega una foto a un producto de Alfa'
);
select throws_ok(
  $$ insert into public.catalog_product_images (id, tenant_id, product_id, storage_path, width, height)
     values ('b3000000-0000-4000-8000-0000000000aa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b2000000-0000-4000-8000-000000000001',
             'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/products/b2000000-0000-4000-8000-000000000001/b3000000-0000-4000-8000-0000000000aa', 10, 10) $$,
  '42501', null, 'staff Alfa: no agrega fotos en Beta'
);
select throws_ok(
  $$ insert into public.catalog_product_images (id, tenant_id, product_id, storage_path, width, height)
     values ('a3000000-0000-4000-8000-0000000000bb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'b2000000-0000-4000-8000-000000000001',
             'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/products/b2000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-0000000000bb', 10, 10) $$,
  '23503', null, 'staff Alfa: no cuelga una foto de Alfa en un producto de Beta (FK compuesta)'
);
select throws_ok(
  $$ update public.catalog_product_images set storage_path = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/x'
     where id = 'a3000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'staff Alfa: no puede cambiar la ruta de una foto (sin permiso de columna)'
);
with d as (
  delete from public.catalog_product_images where tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1
) select is(count(*)::int, 0, 'staff Alfa: no borra fotos de Beta') from d;
with u as (
  update public.catalog_product_images set position = 9 where tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1
) select is(count(*)::int, 0, 'staff Alfa: no reordena fotos de Beta') from u;
with u as (
  update public.catalog_product_images set position = 5 where id = 'a3000000-0000-4000-8000-000000000001' returning 1
) select is(count(*)::int, 1, 'staff Alfa: reordena fotos de Alfa') from u;

reset role;

-- Usuario sin comercio
select pg_temp.login('44444444-4444-4444-8444-444444444444');
set local role authenticated;
select is_empty('select * from public.catalog_product_images', 'sin comercio: no ve fotos');
reset role;

-- Integridad (como postgres)
select pg_temp.logout();

select throws_ok(
  $$ insert into public.catalog_product_images (id, tenant_id, product_id, storage_path, width, height)
     values ('a3000000-0000-4000-8000-0000000000cc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000001',
             'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/products/a2000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-0000000000cc', 10, 10) $$,
  '23514', null, 'integridad: la ruta tiene que estar en la carpeta del propio comercio'
);
select throws_ok(
  $$ insert into public.catalog_product_images (id, tenant_id, product_id, storage_path, width, height)
     values ('a3000000-0000-4000-8000-0000000000dd', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000001',
             'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/products/a2000000-0000-4000-8000-000000000002/a3000000-0000-4000-8000-0000000000dd', 10, 10) $$,
  '23514', null, 'integridad: la ruta tiene que ser la de su producto'
);

-- Límite del plan Base: 3 fotos por producto (la remera de Beta ya tiene 1)
insert into public.catalog_product_images (id, tenant_id, product_id, storage_path, width, height)
select g.id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b2000000-0000-4000-8000-000000000001',
       'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/products/b2000000-0000-4000-8000-000000000001/' || g.id, 10, 10
from (values ('b3000000-0000-4000-8000-000000000002'::uuid), ('b3000000-0000-4000-8000-000000000003'::uuid)) as g (id);
select throws_ok(
  $$ insert into public.catalog_product_images (id, tenant_id, product_id, storage_path, width, height)
     values ('b3000000-0000-4000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b2000000-0000-4000-8000-000000000001',
             'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/products/b2000000-0000-4000-8000-000000000001/b3000000-0000-4000-8000-000000000004', 10, 10) $$,
  'P0001', null, 'integridad: el plan Base no admite una cuarta foto por producto'
);

-- Borrar un producto borra sus fotos
savepoint borrar_producto;
delete from public.catalog_products where id = 'a2000000-0000-4000-8000-000000000001';
select is_empty(
  $$ select * from public.catalog_product_images where product_id = 'a2000000-0000-4000-8000-000000000001' $$,
  'integridad: al borrar un producto se borran sus filas de fotos'
);
rollback to savepoint borrar_producto;

-- =============================================================================
-- Storage: bucket catalog-public
-- =============================================================================
select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'catalog-public' $$,
  $$ values (true, 2097152::bigint, array['image/webp']::text[]) $$,
  'storage: el bucket es público, acepta solo WebP y hasta 2 MB'
);

-- Dueño de Alfa: escribe solo en la carpeta de Alfa
select pg_temp.login('11111111-1111-4111-8111-111111111111');
set local role authenticated;

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('catalog-public', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/products/a2000000-0000-4000-8000-000000000001/prueba-480.webp',
             '11111111-1111-4111-8111-111111111111') $$,
  'storage: el dueño de Alfa sube a la carpeta de Alfa'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('catalog-public', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/products/b2000000-0000-4000-8000-000000000001/intruso-480.webp',
             '11111111-1111-4111-8111-111111111111') $$,
  '42501', null, 'storage: el dueño de Alfa no sube a la carpeta de Beta'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('catalog-public', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/otra-cosa/archivo.webp', '11111111-1111-4111-8111-111111111111') $$,
  '42501', null, 'storage: solo en las subcarpetas products o branding'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('catalog-public', 'archivo-suelto.webp', '11111111-1111-4111-8111-111111111111') $$,
  '42501', null, 'storage: no se puede subir fuera de una carpeta de comercio'
);
select is_empty(
  $$ select name from storage.objects
     where bucket_id = 'catalog-public' and name not like 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/%' $$,
  'storage: el dueño de Alfa no ve archivos de otras carpetas'
);
select ok(
  exists (select 1 from storage.objects where bucket_id = 'catalog-public' and name like '%/prueba-480.webp'),
  'storage: el dueño de Alfa ve el archivo que subió'
);

reset role;

-- Dueña de Beta: no ve ni borra lo de Alfa
select pg_temp.login('22222222-2222-4222-8222-222222222221');
set local role authenticated;
select is_empty(
  $$ select name from storage.objects
     where bucket_id = 'catalog-public' and name not like 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/%' $$,
  'storage: la dueña de Beta no ve los archivos de Alfa ni de otros comercios'
);
-- El borrado no se puede probar con SQL (Storage lo bloquea fuera de su API):
-- lo prueba tests/integration/images.test.ts con la API real.
reset role;

-- Anónimo: no puede listar el bucket (las fotos se ven solo por su URL pública)
select pg_temp.logout();
set local role anon;
select is_empty(
  $$ select * from storage.objects where bucket_id = 'catalog-public' $$,
  'storage: anon no puede listar el bucket'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('catalog-public', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/products/x/anon-480.webp') $$,
  '42501', null, 'storage: anon no sube archivos'
);
reset role;

select * from finish();
rollback;
