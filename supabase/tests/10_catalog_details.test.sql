-- =============================================================================
-- Capa 2 · Catálogo nuevo (parte 2): medios de pago, "Todos los pedidos incluyen",
-- etiquetas y características (docs/superpowers/specs/2026-11-22-catalogo-nuevo-design.md)
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
  ('owner', '11111111-1111-4111-8111-111111111111'),
  ('staff', '11111111-1111-4111-8111-111111111112'),
  ('ownerBeta', '22222222-2222-4222-8222-222222222221'),
  ('doble', 'a2000000-0000-4000-8000-000000000001');
grant select on k to anon, authenticated;
create function pg_temp.k(p text) returns uuid language sql as $$ select id from k where name = p $$;

-- -----------------------------------------------------------------------------
-- Ajustes: solo el dueño, solo valores válidos
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.login(pg_temp.k('owner'));
select lives_ok($$
  update public.tenant_settings
     set payment_methods = '{efectivo,transferencia}',
         highlights = '{"Funda de regalo","Cambios hasta 30 días","3 cuotas sin interés","Envío en el día"}'
   where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$, 'dueño: guarda medios de pago y 4 frases');
select throws_ok($$ update public.tenant_settings set payment_methods = '{cheque}'
                     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$, '23514', null, 'medio de pago fuera de la lista');
select throws_ok($$ update public.tenant_settings set highlights = '{a,b,c,d,e}'
                     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$, '23514', null, 'más de 4 frases');
select throws_ok(format($f$ update public.tenant_settings set highlights = array[%L]
                     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $f$, repeat('x', 61)), '23514', null, 'frase de 61 letras');
select throws_ok($$ update public.tenant_settings set highlights = array['']
                     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$, '23514', null, 'frase vacía');

select pg_temp.login(pg_temp.k('staff'));
with u as (update public.tenant_settings set payment_methods = '{credito}'
           where tenant_id = pg_temp.k('alfa') returning 1)
select is((select count(*)::int from u), 0, 'staff: no cambia los medios de pago');

select pg_temp.login(pg_temp.k('ownerBeta'));
with u as (update public.tenant_settings set highlights = '{Hackeado}'
           where tenant_id = pg_temp.k('alfa') returning 1)
select is((select count(*)::int from u), 0, 'otro comercio: no cambia las frases de Alfa');
reset role;

select is((select payment_methods from public.tenant_settings where tenant_id = pg_temp.k('alfa')),
          '{efectivo,transferencia}'::text[], 'quedaron los medios de pago del dueño');

-- -----------------------------------------------------------------------------
-- Productos: etiquetas y características (dueño y staff)
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.login(pg_temp.k('staff'));
select lives_ok($$
  update public.catalog_products
     set tags = '{nuevo,picante}',
         specs = '[{"label":"Material","value":"Lino"},{"label":"Peso","value":"350 g"}]'
   where id = 'a2000000-0000-4000-8000-000000000001' $$, 'staff: guarda etiquetas y características');
select throws_ok($$ update public.catalog_products set tags = '{nuevo,picante,vegano,sin_tacc}'
                     where id = 'a2000000-0000-4000-8000-000000000001' $$, '23514', null, 'más de 3 etiquetas');
select throws_ok($$ update public.catalog_products set tags = '{oferta}'
                     where id = 'a2000000-0000-4000-8000-000000000001' $$, '23514', null, 'etiqueta fuera de la lista (Oferta es automática)');
select throws_ok($$ update public.catalog_products set tags = '{nuevo,nuevo}'
                     where id = 'a2000000-0000-4000-8000-000000000001' $$, '23514', null, 'etiqueta repetida');
select throws_ok($$ update public.catalog_products
                     set specs = (select jsonb_agg(jsonb_build_object('label', 'L' || g, 'value', 'v')) from generate_series(1, 9) g)
                     where id = 'a2000000-0000-4000-8000-000000000001' $$, '23514', null, 'más de 8 características');
select throws_ok(format($f$ update public.catalog_products set specs = jsonb_build_array(jsonb_build_object('label', %L, 'value', 'v'))
                     where id = 'a2000000-0000-4000-8000-000000000001' $f$, repeat('x', 31)), '23514', null, 'nombre de característica de 31 letras');
select throws_ok(format($f$ update public.catalog_products set specs = jsonb_build_array(jsonb_build_object('label', 'L', 'value', %L))
                     where id = 'a2000000-0000-4000-8000-000000000001' $f$, repeat('x', 61)), '23514', null, 'valor de 61 letras');
select throws_ok($$ update public.catalog_products set specs = '[{"label":"Material"}]'
                     where id = 'a2000000-0000-4000-8000-000000000001' $$, '23514', null, 'característica sin valor');
select throws_ok($$ update public.catalog_products set specs = '{"label":"Material","value":"Lino"}'
                     where id = 'a2000000-0000-4000-8000-000000000001' $$, '23514', null, 'características que no son una lista');

select lives_ok($$ update public.catalog_products set tags = '{liquidacion,importado}'
                   where id = 'a2000000-0000-4000-8000-000000000001' $$, 'etiquetas de ropa y tecnología: Liquidación e Importado');
select lives_ok($$ update public.catalog_products set tags = '{nuevo,picante}'
                   where id = 'a2000000-0000-4000-8000-000000000001' $$, 'vuelve a las etiquetas de comida');

select pg_temp.login(pg_temp.k('ownerBeta'));
with u as (update public.catalog_products set tags = '{nuevo}' where id = pg_temp.k('doble') returning 1)
select is((select count(*)::int from u), 0, 'otro comercio: no cambia etiquetas de Alfa');
reset role;

-- -----------------------------------------------------------------------------
-- Catálogo público: storefront_by_host devuelve los datos nuevos
-- -----------------------------------------------------------------------------
set local role anon;
select pg_temp.logout();
select is(public.storefront_by_host('alfa.localhost') -> 'payment_methods', '["efectivo", "transferencia"]'::jsonb,
          'anónimo: ve los medios de pago del comercio público');
select is(jsonb_array_length(public.storefront_by_host('alfa.localhost') -> 'highlights'), 4, 'anónimo: ve las frases');
select is((select tags from public.catalog_products where id = pg_temp.k('doble')), '{nuevo,picante}'::text[],
          'anónimo: ve las etiquetas del producto publicado');
select is(public.storefront_by_host('gamma.localhost'), '{"available": false}'::jsonb, 'comercio suspendido: sigue sin datos');
reset role;

select * from finish();
rollback;
