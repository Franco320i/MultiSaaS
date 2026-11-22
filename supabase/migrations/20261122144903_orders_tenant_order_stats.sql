-- =============================================================================
-- Tarjeta de resultados del panel (docs/superpowers/specs/2026-11-22-tarjeta-resultados-design.md)
--
-- public.tenant_order_stats(tenant, ahora): números del mes en curso para el inicio del panel.
-- SECURITY INVOKER: corre con la sesión del usuario y RLS de orders/order_items deja ver
-- solo los comercios de los que es miembro; para cualquier otro comercio devuelve ceros.
-- El tenant_id lo pasa el servidor después de requireTenantAccess, nunca el navegador.
-- p_now existe para poder probarla con fechas fijas.
--
-- - Mes y período en la zona horaria del comercio (tenant_settings.timezone).
-- - Sin cancelados. Monto = suma de total (con envío).
-- - Comparación contra los mismos días del mes anterior (del 1 hasta el mismo momento),
--   sin pasarse del fin de ese mes (31/03 se compara con febrero entero).
-- - El más pedido: más unidades en el mes; con empate, el que está en más pedidos.
-- - new_orders: pedidos en estado "nuevo" sin atender, de cualquier fecha.
-- Usa el índice orders_tenant_created_at_idx.
-- =============================================================================

create function public.tenant_order_stats(p_tenant_id uuid, p_now timestamptz default now())
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with tz as (
    select coalesce(
      (select s.timezone from public.tenant_settings s where s.tenant_id = p_tenant_id),
      'America/Argentina/Buenos_Aires') as name
  ),
  bounds as (
    select
      tz.name,
      (p_now at time zone tz.name) as local_now,
      date_trunc('month', p_now at time zone tz.name) as month_start
    from tz
  ),
  periods as (
    select
      (b.month_start at time zone b.name) as cur_from,
      p_now as cur_to,
      ((b.month_start - interval '1 month') at time zone b.name) as prev_from,
      (least(b.month_start - interval '1 month' + (b.local_now - b.month_start), b.month_start) at time zone b.name) as prev_to,
      extract(month from b.local_now)::int as month
    from bounds b
  ),
  cur as (
    select o.id, o.total
    from public.orders o, periods p
    where o.tenant_id = p_tenant_id and o.status <> 'cancelled'
      and o.created_at >= p.cur_from and o.created_at <= p.cur_to
  ),
  prev as (
    select count(*) as n, coalesce(sum(o.total), 0) as total
    from public.orders o, periods p
    where o.tenant_id = p_tenant_id and o.status <> 'cancelled'
      and o.created_at >= p.prev_from and o.created_at < p.prev_to
  ),
  top as (
    select i.product_name as name, sum(i.quantity)::int as units
    from public.order_items i
    join cur c on c.id = i.order_id
    where i.tenant_id = p_tenant_id
    group by i.product_name
    order by sum(i.quantity) desc, count(distinct i.order_id) desc, i.product_name
    limit 1
  )
  select jsonb_build_object(
    'month', (select month from periods),
    'month_orders', (select count(*) from cur),
    'month_total', (select coalesce(sum(total), 0) from cur),
    'prev_orders', (select n from prev),
    'prev_total', (select total from prev),
    'top_product', (select jsonb_build_object('name', name, 'units', units) from top),
    'new_orders', (select count(*) from public.orders o where o.tenant_id = p_tenant_id and o.status = 'new')
  );
$$;

revoke execute on function public.tenant_order_stats(uuid, timestamptz) from public, anon;
grant execute on function public.tenant_order_stats(uuid, timestamptz) to authenticated;
