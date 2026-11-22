-- =============================================================================
-- Capa 2 · Tarjeta de resultados del panel: public.tenant_order_stats
-- (docs/superpowers/specs/2026-11-22-tarjeta-resultados-design.md)
-- Pedidos propios en mayo de 2030 para no depender de la fecha del seed.
-- "Ahora" = 15/05/2030 15:00 en Argentina. Mes: 1 al 15. Mismo período de abril: 1 al 15.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

create temp table k (name text primary key, id uuid) on commit drop;
insert into k values
  ('alfa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('owner', '11111111-1111-4111-8111-111111111111'),
  ('staff', '11111111-1111-4111-8111-111111111112'),
  ('ownerBeta', '22222222-2222-4222-8222-222222222221'),
  ('nobody', '44444444-4444-4444-8444-444444444444');
grant select on k to anon, authenticated;

create function pg_temp.k(p text) returns uuid language sql as $$ select id from k where name = p $$;

-- Pedido de Alfa con un ítem.
create function pg_temp.order_at(p_number int, p_at timestamptz, p_total bigint, p_status text, p_item text, p_qty int)
returns void language plpgsql as $$
declare v_id uuid;
begin
  insert into public.orders (tenant_id, number, status, fulfillment, customer_name, customer_phone,
                             subtotal, delivery_fee, total, idempotency_key, created_at)
  values (pg_temp.k('alfa'), p_number, p_status, 'pickup', 'Cliente Prueba', '2954 000000',
          p_total, 0, p_total, gen_random_uuid(), p_at)
  returning id into v_id;
  insert into public.order_items (tenant_id, order_id, product_name, unit_price, quantity, line_total, position)
  values (pg_temp.k('alfa'), v_id, p_item, p_total / p_qty, p_qty, (p_total / p_qty) * p_qty, 1);
end $$;

-- Mes en curso (mayo)
select pg_temp.order_at(1001, '2030-05-02 10:00-03', 10000, 'completed', 'Doble cheddar', 2);
select pg_temp.order_at(1002, '2030-05-14 22:00-03',  5000, 'new',       'Doble cheddar', 1);
select pg_temp.order_at(1003, '2030-05-10 12:00-03',  7000, 'cancelled', 'Simple',        5);  -- cancelado: no cuenta
select pg_temp.order_at(1004, '2030-05-16 12:00-03',  9999, 'new',       'Simple',        9);  -- después de "ahora"
-- 01/05 01:00 UTC es 30/04 22:00 en Argentina: es de abril, y fuera del mismo período
select pg_temp.order_at(1005, '2030-05-01 01:00+00',   300, 'completed', 'Simple',        1);
-- Abril
select pg_temp.order_at(1006, '2030-04-03 12:00-03',  4000, 'confirmed', 'Simple',        1);  -- mismo período
select pg_temp.order_at(1007, '2030-04-20 12:00-03',  8000, 'completed', 'Simple',        1);  -- fuera del período

create temp table r (who text primary key, stats jsonb) on commit drop;
grant all on r to authenticated;

set local role authenticated;
select pg_temp.login(pg_temp.k('owner'));
insert into r select 'owner', public.tenant_order_stats(pg_temp.k('alfa'), '2030-05-15 15:00-03');
select pg_temp.login(pg_temp.k('staff'));
insert into r select 'staff', public.tenant_order_stats(pg_temp.k('alfa'), '2030-05-15 15:00-03');
select pg_temp.login(pg_temp.k('ownerBeta'));
insert into r select 'ownerBeta', public.tenant_order_stats(pg_temp.k('alfa'), '2030-05-15 15:00-03');
select pg_temp.login(pg_temp.k('nobody'));
insert into r select 'nobody', public.tenant_order_stats(pg_temp.k('alfa'), '2030-05-15 15:00-03');
reset role;

select is((select (stats ->> 'month_orders')::int from r where who = 'owner'), 2, 'dueño: pedidos del mes sin cancelados ni futuros');
select is((select (stats ->> 'month_total')::bigint from r where who = 'owner'), 15000::bigint, 'dueño: monto del mes');
select is((select (stats ->> 'prev_orders')::int from r where who = 'owner'), 1, 'dueño: mismo período del mes anterior');
select is((select (stats ->> 'prev_total')::bigint from r where who = 'owner'), 4000::bigint, 'dueño: monto del mismo período anterior');
select is((select stats -> 'top_product' ->> 'name' from r where who = 'owner'), 'Doble cheddar', 'dueño: el más pedido por unidades');
select is((select (stats -> 'top_product' ->> 'units')::int from r where who = 'owner'), 3, 'dueño: unidades del más pedido');
select is((select (stats ->> 'month')::int from r where who = 'owner'), 5, 'el mes sale en la hora del comercio');
select ok((select (stats ->> 'new_orders')::int >= 2 from r where who = 'owner'), 'dueño: cuenta los pedidos nuevos sin atender');
select is((select stats from r where who = 'staff'), (select stats from r where who = 'owner'), 'staff ve lo mismo que el dueño');

select is((select (stats ->> 'month_orders')::int from r where who = 'ownerBeta'), 0, 'otro comercio: ceros (RLS)');
select is((select stats -> 'top_product' from r where who = 'ownerBeta'), 'null'::jsonb, 'otro comercio: sin producto');
select is((select (stats ->> 'new_orders')::int from r where who = 'ownerBeta'), 0, 'otro comercio: sin pedidos nuevos');
select is((select (stats ->> 'month_orders')::int from r where who = 'nobody'), 0, 'sin comercio: ceros (RLS)');

-- Fin de mes más largo que el anterior: 31/03 → período de febrero hasta el 28 (no se pasa a marzo)
select pg_temp.order_at(1008, '2030-03-01 00:30-03', 1000, 'completed', 'Simple', 1);
set local role authenticated;
select pg_temp.login(pg_temp.k('owner'));
select is((public.tenant_order_stats(pg_temp.k('alfa'), '2030-03-31 20:00-03') ->> 'prev_orders')::int, 0,
          '31 de marzo: el período anterior termina con febrero, sin tomar marzo');
reset role;

set local role anon;
select throws_ok($$ select public.tenant_order_stats('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') $$, '42501', null,
                 'anónimo: no puede llamarla');
reset role;

select * from finish();
rollback;
