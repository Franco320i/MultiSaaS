-- =============================================================================
-- Tarea diaria sin suspensión automática (decisión del 2026-11-21, etapa 10d).
--
-- Con cobro y confirmación de pago manuales y sin correos de aviso a los comercios,
-- suspender solo podía cortar el catálogo de alguien que ya pagó y todavía no estaba
-- registrado. La tarea diaria ahora solo marca: lo vencido sin pago pasa a past_due
-- (el catálogo sigue visible) y queda en el filtro "Pago pendiente" del panel central.
-- Suspender es siempre una acción del superadmin, con motivo (admin_set_tenant_status).
--
-- También deja de calcular avisos de prueba por vencer: no se envían correos a los
-- dueños, y el panel central ya tiene el filtro "Pruebas que vencen en 7 días".
--
-- Misma firma y mismo tipo de retorno: create or replace conserva los permisos
-- (solo service_role) y el envoltorio public.daily_maintenance no cambia.
-- =============================================================================

create or replace function private.daily_maintenance()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_past_due uuid[];
  v_cleaned  integer;
begin
  -- 1. Vencidos sin pago → past_due (sigue visible; nunca se suspende desde acá)
  with expired as (
    select t.id
    from public.tenants t
    join public.subscriptions s on s.tenant_id = t.id and s.status <> 'cancelled'
    where t.status in ('trial', 'active')
      and s.current_period_end < now()
    for update of t
  ), moved as (
    update public.tenants t set status = 'past_due'
    from expired e where t.id = e.id
    returning t.id
  )
  select coalesce(array_agg(id), '{}') into v_past_due from moved;

  update public.subscriptions set status = 'past_due'
  where tenant_id = any (v_past_due) and status in ('trialing', 'active');

  insert into public.audit_log (tenant_id, actor_kind, action, target_type, target_id, changes)
  select id, 'system', 'tenant.past_due', 'tenant', id::text, '{"by": "daily_maintenance"}'::jsonb
  from unnest(v_past_due) as id;
  insert into public.events (tenant_id, type, entity_type, entity_id, actor_kind)
  select id, 'tenant.past_due', 'tenant', id, 'system' from unnest(v_past_due) as id;

  -- 2. Limpieza de límites de frecuencia
  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics v_cleaned = row_count;

  return jsonb_build_object(
    'past_due', to_jsonb(v_past_due),
    'rate_limits_cleaned', v_cleaned
  );
end;
$$;
