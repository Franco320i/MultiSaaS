-- =============================================================================
-- Capa 2 · Módulo pedidos: RLS de orders / order_items y private.create_order
-- Usa los datos de supabase/seed.sql:
--   Alfa (envío $1.500, mínimo $5.000): pedidos #1 (nuevo, envío) y #2 (confirmado)
--   Beta (solo retiro, sin mínimo): pedido #1 · Gamma: suspendido
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
-- Pedido de retiro válido con una clave nueva; p_extra pisa campos.
create function pg_temp.req(p_items jsonb, p_extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object(
    'idempotency_key', gen_random_uuid(), 'customer_name', 'Ana Ruiz',
    'customer_phone', '2954 444444', 'fulfillment', 'pickup', 'items', p_items) || p_extra;
$$;
create function pg_temp.line(p_product text, p_qty int) returns jsonb language sql as $$
  select jsonb_build_object('product_id', p_product, 'quantity', p_qty);
$$;

-- Constantes legibles
create temp table ids (k text primary key, v uuid) on commit drop;
insert into ids values
  ('alfa',   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('beta',   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('gamma',  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  ('doble',  'a2000000-0000-4000-8000-000000000001'),
  ('simple', 'a2000000-0000-4000-8000-000000000002'),
  ('gaseosa','a2000000-0000-4000-8000-000000000003'),
  ('vegana', 'a2000000-0000-4000-8000-000000000004'),
  ('remera', 'b2000000-0000-4000-8000-000000000001'),
  ('gorra',  'b2000000-0000-4000-8000-000000000002');
grant select on ids to anon, authenticated, service_role;

-- =============================================================================
-- Datos del seed
-- =============================================================================
select is(
  (select count(*)::int from public.orders where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 2,
  'seed: Alfa tiene 2 pedidos'
);
select is(
  (select total from public.orders where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and number = 1),
  2600000::bigint,
  'seed: Alfa #1 = 2 × $9.000 + 1 × $6.500 + envío $1.500 = $26.000'
);
select is(
  (select count(*)::int from public.events where type = 'order.created'), 3,
  'seed: cada pedido emitió order.created'
);
select is(
  (select count(*)::int from public.events where type = 'order.status_changed'), 1,
  'seed: confirmar Alfa #2 emitió order.status_changed'
);

-- =============================================================================
-- Anónimo: nada
-- =============================================================================
select pg_temp.logout();
set local role anon;

select throws_ok('select * from public.orders', '42501', null, 'anon: no lee pedidos');
select throws_ok('select * from public.order_items', '42501', null, 'anon: no lee líneas');
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       pg_temp.req(jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000001', 1)))) $$,
  '42501', null, 'anon: no puede crear pedidos con la clave publicable'
);
select throws_ok(
  $$ select private.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{}'::jsonb) $$,
  '42501', null, 'anon: no puede llamar a private.create_order'
);
select throws_ok(
  $$ insert into public.orders (tenant_id, number, fulfillment, customer_name, customer_phone, subtotal, total, idempotency_key)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 99, 'pickup', 'Spam', '123456', 1, 1, gen_random_uuid()) $$,
  '42501', null, 'anon: no inserta pedidos directo'
);

-- =============================================================================
-- Dueño de Alfa
-- =============================================================================
reset role;
select pg_temp.login('11111111-1111-4111-8111-111111111111');
set local role authenticated;

select set_eq(
  $$ select left(tenant_id::text, 4) || '#' || number from public.orders $$,
  array['aaaa#1', 'aaaa#2'],
  'dueño Alfa: ve solo los pedidos de Alfa'
);
select is(
  (select count(*)::int from public.order_items), 3,
  'dueño Alfa: ve solo las líneas de Alfa'
);
select lives_ok(
  $$ update public.orders set status = 'confirmed'
     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and number = 1 $$,
  'dueño Alfa: confirma un pedido'
);
select throws_ok(
  $$ update public.orders set status = 'new'
     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and number = 1 $$,
  'P0001', 'invalid_status_transition', 'dueño Alfa: no puede volver un pedido atrás'
);
select throws_ok(
  $$ update public.orders set total = 1 where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501', null, 'dueño Alfa: no puede cambiar el total (solo el estado)'
);
select throws_ok(
  $$ update public.orders set customer_name = 'Otro' where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501', null, 'dueño Alfa: no puede cambiar datos del cliente'
);
select throws_ok(
  $$ delete from public.orders where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501', null, 'dueño Alfa: no borra pedidos'
);
select throws_ok(
  $$ update public.order_items set quantity = 50 $$,
  '42501', null, 'dueño Alfa: no edita líneas'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       pg_temp.req(jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000001', 1)))) $$,
  '42501', null, 'dueño Alfa: tampoco crea pedidos desde el navegador'
);

-- Otro comercio
with u as (
  update public.orders set status = 'cancelled'
  where tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1
) select is(count(*)::int, 0, 'dueño Alfa: no puede cancelar pedidos de Beta') from u;

-- =============================================================================
-- Staff de Alfa: lee y cambia estados
-- =============================================================================
select pg_temp.login('11111111-1111-4111-8111-111111111112');
select is((select count(*)::int from public.orders), 2, 'staff Alfa: ve los pedidos de Alfa');
select lives_ok(
  $$ update public.orders set status = 'preparing'
     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and number = 1 $$,
  'staff Alfa: pasa un pedido a "en preparación"'
);
select lives_ok(
  $$ update public.orders set status = 'completed'
     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and number = 1 $$,
  'staff Alfa: puede saltear pasos hacia adelante'
);
select throws_ok(
  $$ update public.orders set status = 'cancelled'
     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and number = 1 $$,
  'P0001', 'order_closed', 'staff Alfa: un pedido entregado ya no se cancela'
);
select lives_ok(
  $$ update public.orders set status = 'cancelled'
     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and number = 2 $$,
  'staff Alfa: cancela un pedido confirmado'
);

-- =============================================================================
-- Dueña de Beta y usuario sin comercio
-- =============================================================================
select pg_temp.login('22222222-2222-4222-8222-222222222221');
select set_eq(
  $$ select left(tenant_id::text, 4) || '#' || number from public.orders $$,
  array['bbbb#1'],
  'dueña Beta: ve solo su pedido'
);
select is_empty(
  $$ select * from public.order_items where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'dueña Beta: no ve líneas de Alfa'
);

select pg_temp.login('44444444-4444-4444-8444-444444444444');
select is_empty('select * from public.orders', 'sin comercio: no ve pedidos');
select is_empty('select * from public.order_items', 'sin comercio: no ve líneas');

-- Eventos de los cambios de estado, con quién los hizo
reset role;
select is(
  (select count(*)::int from public.events
   where type = 'order.status_changed' and actor_kind = 'staff'
     and actor_id = '11111111-1111-4111-8111-111111111112'),
  3,
  'cada cambio de estado del staff quedó en events con su usuario'
);

-- =============================================================================
-- create_order (como el servidor: service_role)
-- =============================================================================
set local role service_role;

-- Camino feliz: el precio sale de la base aunque el navegador mande otro.
select is(
  public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_temp.req(
    jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000001', 1) || '{"unit_price": 1, "price": 1}'),
    jsonb_build_object('idempotency_key', 'a7000000-0000-4000-8000-0000000000aa',
                       'fulfillment', 'delivery', 'delivery_address', 'Mitre 456',
                       'total', 1, 'tenant_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'))
  ) - 'order_id',
  '{"number": 3, "created": true, "fulfillment": "delivery", "customer_name": "Ana Ruiz",
    "delivery_address": "Mitre 456", "notes": null, "subtotal": 900000, "delivery_fee": 150000,
    "total": 1050000, "items": [{"product_name": "Hamburguesa doble", "quantity": 1,
    "unit_price": 900000, "line_total": 900000}]}'::jsonb,
  'create_order: precios, envío y total salen de la base; ignora precio, total y tenant_id enviados'
);
select is(
  (select tenant_id from public.orders where idempotency_key = 'a7000000-0000-4000-8000-0000000000aa'),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'create_order: el pedido queda en el comercio del argumento, no en el del cuerpo'
);
select is(
  public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_temp.req(
    jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000002', 5)),
    '{"idempotency_key": "a7000000-0000-4000-8000-0000000000aa"}')) ->> 'created',
  'false',
  'create_order: la misma clave (doble clic) devuelve el pedido existente'
);
select is(
  (select count(*)::int from public.orders where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 3,
  'create_order: el doble clic no creó otro pedido'
);
select is(
  public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_temp.req(jsonb_build_array(
    pg_temp.line('a2000000-0000-4000-8000-000000000002', 1),
    pg_temp.line('a2000000-0000-4000-8000-000000000001', 1),
    pg_temp.line('a2000000-0000-4000-8000-000000000002', 2)))) -> 'items',
  '[{"product_name": "Hamburguesa simple", "quantity": 3, "unit_price": 650000, "line_total": 1950000},
    {"product_name": "Hamburguesa doble", "quantity": 1, "unit_price": 900000, "line_total": 900000}]'::jsonb,
  'create_order: un producto repetido se suma en una línea y se respeta el orden'
);
select is(
  public.create_order('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', pg_temp.req(jsonb_build_array(
    pg_temp.line('b2000000-0000-4000-8000-000000000002', 1)))) ->> 'number',
  '2',
  'create_order: la numeración es por comercio (Beta sigue en #2)'
);
select is(
  (select count(*)::int from public.events e
   join public.orders o on o.id = e.entity_id
   where e.type = 'order.created' and o.idempotency_key = 'a7000000-0000-4000-8000-0000000000aa'
     and e.actor_kind = 'customer' and not (e.payload ? 'customer_name')),
  1,
  'create_order: emite order.created sin datos personales'
);

-- Productos que no se pueden pedir
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       pg_temp.req(jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000003', 1)))) $$,
  'P0001', 'products_unavailable', 'create_order: rechaza un producto sin stock'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       pg_temp.req(jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000004', 1)))) $$,
  'P0001', 'products_unavailable', 'create_order: rechaza un borrador'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_temp.req(jsonb_build_array(
       pg_temp.line('a2000000-0000-4000-8000-000000000001', 1),
       pg_temp.line('b2000000-0000-4000-8000-000000000001', 1)))) $$,
  'P0001', 'products_unavailable', 'create_order: rechaza un producto de otro comercio'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       pg_temp.req(jsonb_build_array(pg_temp.line('9a000000-0000-4000-8000-000000000000', 1)))) $$,
  'P0001', 'products_unavailable', 'create_order: rechaza un producto inexistente'
);

-- Reglas del comercio
select throws_ok(
  $$ select public.create_order('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
       pg_temp.req(jsonb_build_array(pg_temp.line('c2000000-0000-4000-8000-000000000001', 1)))) $$,
  'P0001', 'tenant_unavailable', 'create_order: un comercio suspendido no recibe pedidos'
);
select throws_ok(
  $$ select public.create_order('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', pg_temp.req(
       jsonb_build_array(pg_temp.line('b2000000-0000-4000-8000-000000000001', 1)),
       '{"fulfillment": "delivery", "delivery_address": "Mitre 456"}')) $$,
  'P0001', 'fulfillment_not_available', 'create_order: Beta no hace envíos'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_temp.req(
       jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000001', 1)),
       '{"fulfillment": "delivery"}')) $$,
  'P0001', 'invalid_customer', 'create_order: un envío sin dirección se rechaza'
);

reset role;
update public.tenant_settings set min_order_amount = 2000000 where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
update public.tenant_modules set enabled = false where tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and module_key = 'orders';
update public.catalog_products set category_id = 'a1000000-0000-4000-8000-000000000003'  -- Promos (oculta)
where id = 'a2000000-0000-4000-8000-000000000002';
set local role service_role;

select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       pg_temp.req(jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000001', 1)))) $$,
  'P0001', 'below_minimum', 'create_order: respeta el pedido mínimo (sobre el subtotal)'
);
select throws_ok(
  $$ select public.create_order('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
       pg_temp.req(jsonb_build_array(pg_temp.line('b2000000-0000-4000-8000-000000000001', 1)))) $$,
  'P0001', 'orders_disabled', 'create_order: sin el módulo de pedidos activo no se crean'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       pg_temp.req(jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000002', 4)))) $$,
  'P0001', 'products_unavailable', 'create_order: un producto de una categoría oculta no se puede pedir'
);

-- Validaciones de entrada
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_temp.req('[]'::jsonb)) $$,
  'P0001', 'invalid_items', 'create_order: sin líneas'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_temp.req(
       (select jsonb_agg(pg_temp.line('a2000000-0000-4000-8000-000000000001', 1)) from generate_series(1, 51)))) $$,
  'P0001', 'invalid_items', 'create_order: más de 50 líneas'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       pg_temp.req(jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000001', 0)))) $$,
  'P0001', 'invalid_items', 'create_order: cantidad 0'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_temp.req(jsonb_build_array(
       pg_temp.line('a2000000-0000-4000-8000-000000000001', 60),
       pg_temp.line('a2000000-0000-4000-8000-000000000001', 60)))) $$,
  'P0001', 'invalid_items', 'create_order: más de 99 unidades de un producto (sumando líneas)'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       pg_temp.req('[{"product_id": "no-es-un-uuid", "quantity": 1}]'::jsonb)) $$,
  'P0001', 'invalid_items', 'create_order: id de producto inválido'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       pg_temp.req('[{"product_id": "a2000000-0000-4000-8000-000000000001", "quantity": "mucho"}]'::jsonb)) $$,
  'P0001', 'invalid_items', 'create_order: cantidad que no es un número'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_temp.req(
       jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000001', 1)), '{"idempotency_key": null}')) $$,
  'P0001', 'invalid_order', 'create_order: sin clave de idempotencia'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_temp.req(
       jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000001', 1)), '{"customer_name": "A"}')) $$,
  'P0001', 'invalid_customer', 'create_order: nombre demasiado corto'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_temp.req(
       jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000001', 1)), '{"customer_phone": "llamame"}')) $$,
  'P0001', 'invalid_customer', 'create_order: teléfono inválido'
);
select throws_ok(
  $$ select public.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_temp.req(
       jsonb_build_array(pg_temp.line('a2000000-0000-4000-8000-000000000001', 1)), '{"fulfillment": "drone"}')) $$,
  'P0001', 'invalid_order', 'create_order: tipo de entrega desconocido'
);

-- =============================================================================
-- Integridad
-- =============================================================================
reset role;
select throws_ok(
  $$ update public.orders set tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and number = 3 $$,
  '42501', null, 'integridad: un pedido no se cambia de comercio'
);
select throws_ok(
  $$ insert into public.order_items (tenant_id, order_id, product_id, product_name, unit_price, quantity, line_total, position)
     select o.tenant_id, o.id, 'b2000000-0000-4000-8000-000000000001', 'Remera', 1, 1, 1, 9
     from public.orders o where o.tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and o.number = 3 $$,
  '23503', null, 'integridad: una línea de Alfa no puede apuntar a un producto de Beta'
);
select throws_ok(
  $$ insert into public.order_items (tenant_id, order_id, product_name, unit_price, quantity, line_total, position)
     select 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', o.id, 'X', 1, 1, 1, 9
     from public.orders o where o.tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and o.number = 3 $$,
  '23503', null, 'integridad: una línea de Beta no puede colgar de un pedido de Alfa'
);
select throws_ok(
  $$ update public.orders set total = total + 1
     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and number = 3 $$,
  '23514', null, 'integridad: total = subtotal + envío'
);
select lives_ok(
  $$ delete from public.catalog_products where id = 'a2000000-0000-4000-8000-000000000001' $$,
  'integridad: se puede borrar un producto que tiene pedidos'
);
select is(
  (select product_name || ' ' || coalesce(product_id::text, 'null') from public.order_items i
   join public.orders o on o.tenant_id = i.tenant_id and o.id = i.order_id
   where o.tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and o.number = 3),
  'Hamburguesa doble null',
  'integridad: el pedido conserva nombre y precio del producto borrado'
);

select * from finish();
rollback;
