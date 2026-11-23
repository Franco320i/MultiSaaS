-- =============================================================================
-- Capa 2 · Pedidos con opciones: private.create_order valida y calcula los adicionales
-- (docs/superpowers/specs/2026-11-23-opciones-producto-design.md)
-- "Hamburguesa a elección" $8.000: Tamaño (obligatorio, una) Simple +0 / Doble +1.500;
-- Extras (opcional, hasta 2) Panceta +800 / Huevo +500 (agotado).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create temp table k (name text primary key, id uuid) on commit drop;
insert into k values
  ('alfa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('beta', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('eleccion', 'a2000000-0000-4000-8000-000000000005'),
  ('doble', 'a2000000-0000-4000-8000-000000000001'),
  ('remera', 'b2000000-0000-4000-8000-000000000001'),
  ('o_simple', 'a5000000-0000-4000-8000-000000000001'),
  ('o_doble', 'a5000000-0000-4000-8000-000000000002'),
  ('o_panceta', 'a5000000-0000-4000-8000-000000000003'),
  ('o_huevo', 'a5000000-0000-4000-8000-000000000004');
create function pg_temp.k(p text) returns uuid language sql as $$ select id from k where name = p $$;

-- Pedido de retiro con las líneas dadas.
create function pg_temp.req(p_items jsonb) returns jsonb language sql as $$
  select jsonb_build_object('idempotency_key', gen_random_uuid(), 'customer_name', 'Ana Ruiz',
    'customer_phone', '2954 444444', 'fulfillment', 'pickup', 'items', p_items);
$$;
create function pg_temp.line(p_product text, p_qty int, p_options text[] default '{}') returns jsonb language sql as $$
  select jsonb_build_object('product_id', pg_temp.k(p_product), 'quantity', p_qty,
    'option_ids', (select coalesce(jsonb_agg(pg_temp.k(o)), '[]'::jsonb) from unnest(p_options) o));
$$;

-- Con el tamaño y un extra: 8.000 + 1.500 + 800 = 10.300 por unidad.
create temp table r1 on commit drop as
  select private.create_order(pg_temp.k('alfa'), pg_temp.req(jsonb_build_array(
    pg_temp.line('eleccion', 2, array['o_doble', 'o_panceta'])))) as s;
select is((select (s -> 'items' -> 0 ->> 'unit_price')::bigint from r1), 1030000::bigint, 'precio unitario con los adicionales');
select is((select (s ->> 'subtotal')::bigint from r1), 2060000::bigint, 'subtotal = unitario × cantidad');
select is((select s -> 'items' -> 0 -> 'options' from r1),
          '[{"group": "Tamaño", "name": "Doble", "price_delta": 150000}, {"group": "Extras", "name": "Panceta", "price_delta": 80000}]'::jsonb,
          'guarda la copia de lo elegido, en el orden de los grupos');

-- Un precio inventado en el pedido se ignora.
create temp table r2 on commit drop as
  select private.create_order(pg_temp.k('alfa'),
    pg_temp.req(jsonb_build_array(pg_temp.line('eleccion', 1, array['o_simple']) || '{"unit_price": 1, "price": 1}'::jsonb))) as s;
select is((select (s ->> 'subtotal')::bigint from r2), 800000::bigint, 'un precio mandado por el navegador se ignora');

-- La misma combinación en otro orden se suma; combinaciones distintas quedan aparte.
create temp table r3 on commit drop as
  select private.create_order(pg_temp.k('alfa'), pg_temp.req(jsonb_build_array(
    pg_temp.line('eleccion', 1, array['o_doble', 'o_panceta']),
    pg_temp.line('eleccion', 2, array['o_panceta', 'o_doble']),
    pg_temp.line('eleccion', 1, array['o_simple']),
    pg_temp.line('doble', 1)))) as s;
select is((select jsonb_array_length(s -> 'items') from r3), 3, 'misma combinación en otro orden: una sola línea');
select is((select (s -> 'items' -> 0 ->> 'quantity')::int from r3), 3, 'esa línea suma las cantidades');
select is((select s -> 'items' -> 2 -> 'options' from r3), '[]'::jsonb, 'un producto sin opciones sigue igual que antes');

-- Errores.
select throws_ok($$ select private.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  pg_temp.req(jsonb_build_array(pg_temp.line('eleccion', 1, array['o_panceta'])))) $$,
  'P0001', 'options_invalid', 'falta el grupo obligatorio');
select throws_ok($$ select private.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  pg_temp.req(jsonb_build_array(pg_temp.line('eleccion', 1, array['o_simple', 'o_doble'])))) $$,
  'P0001', 'options_invalid', 'dos opciones en un grupo de una');
select throws_ok($$ select private.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  pg_temp.req(jsonb_build_array(pg_temp.line('eleccion', 1, array['o_simple', 'o_simple'])))) $$,
  'P0001', 'options_invalid', 'la misma opción repetida');
select throws_ok($$ select private.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  pg_temp.req(jsonb_build_array(pg_temp.line('doble', 1, array['o_simple'])))) $$,
  'P0001', 'options_invalid', 'una opción de otro producto');
select throws_ok($$ select private.create_order('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  pg_temp.req(jsonb_build_array(pg_temp.line('remera', 1, array['o_simple'])))) $$,
  'P0001', 'options_invalid', 'una opción de otro comercio');
select throws_ok($$ select private.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  pg_temp.req(jsonb_build_array(pg_temp.line('eleccion', 1, array['o_simple', 'o_huevo'])))) $$,
  'P0001', 'options_invalid', 'una opción agotada');
select throws_ok($$ select private.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  pg_temp.req(jsonb_build_array(jsonb_build_object('product_id', 'a2000000-0000-4000-8000-000000000005',
    'quantity', 1, 'option_ids', '["no-es-uuid"]'::jsonb)))) $$,
  'P0001', 'invalid_items', 'option_ids con basura');

-- Máximo de un grupo de varias: con Huevo disponible, Panceta + Huevo entra; tres no.
update public.catalog_options set is_available = true where id = pg_temp.k('o_huevo');
select lives_ok($$ select private.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  pg_temp.req(jsonb_build_array(pg_temp.line('eleccion', 1, array['o_simple', 'o_panceta', 'o_huevo'])))) $$,
  'dos extras entran en "hasta 2"');
insert into public.catalog_options (id, tenant_id, group_id, name, price_delta)
values ('a5000000-0000-4000-8000-000000000099', pg_temp.k('alfa'), 'a4000000-0000-4000-8000-000000000002', 'Cebolla', 0);
insert into k values ('o_cebolla', 'a5000000-0000-4000-8000-000000000099');
select throws_ok($$ select private.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  pg_temp.req(jsonb_build_array(pg_temp.line('eleccion', 1, array['o_simple', 'o_panceta', 'o_huevo', 'o_cebolla'])))) $$,
  'P0001', 'options_invalid', 'tres extras pasan el máximo de 2');

-- Pedidos sin option_ids (navegadores con la versión anterior) siguen funcionando.
select lives_ok($$ select private.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  pg_temp.req('[{"product_id": "a2000000-0000-4000-8000-000000000001", "quantity": 1}]'::jsonb)) $$,
  'una línea sin option_ids de un producto sin opciones');

select * from finish();
rollback;
