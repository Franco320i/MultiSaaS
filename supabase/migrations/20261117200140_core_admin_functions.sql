-- =============================================================================
-- Panel central: escrituras auditadas y tarea diaria (diseño, sección 9).
--
-- Toda acción del panel central que cambia datos pasa por una función private.admin_*
-- que valida, cambia y escribe audit_log (y su evento) en la MISMA transacción: no
-- puede existir un cambio sin su registro. Sin motivo, la acción se rechaza.
-- El servidor las llama con la clave secreta (core/admin, lista cerrada) a través de
-- envoltorios public.* SECURITY INVOKER que solo ejecuta service_role. Además, cada
-- función vuelve a comprobar que el actor sea superadmin (defensa en profundidad).
--
-- Errores (P0001, el mensaje es un código): not_superadmin, tenant_not_found,
-- reason_required, invalid_status, invalid_payment, invalid_plan, over_plan_limit,
-- invalid_days, no_subscription.
-- =============================================================================

create function private.assert_superadmin(p_actor uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_actor is null or not exists (
    select 1 from public.platform_admins a where a.user_id = p_actor and a.role = 'superadmin'
  ) then
    raise exception 'not_superadmin' using errcode = 'P0001';
  end if;
end;
$$;

create function private.require_reason(p_reason text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  return btrim(p_reason);
end;
$$;

-- -----------------------------------------------------------------------------
-- Estado del comercio: suspender, reactivar o cancelar (con motivo).
-- -----------------------------------------------------------------------------
create function private.admin_set_tenant_status(p_actor uuid, p_tenant_id uuid, p_status text, p_reason text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_reason text;
  v_from   text;
begin
  perform private.assert_superadmin(p_actor);
  v_reason := private.require_reason(p_reason);
  if p_status not in ('active', 'suspended', 'cancelled') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;

  select t.status into v_from from public.tenants t where t.id = p_tenant_id for update;
  if not found then
    raise exception 'tenant_not_found' using errcode = 'P0001';
  end if;
  if v_from = p_status then
    return v_from;
  end if;
  if v_from = 'cancelled' then
    -- Un comercio cancelado no se reactiva desde acá (purga manual, diseño sección 10).
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;

  update public.tenants
  set status = p_status,
      status_reason = case when p_status = 'active' then null else v_reason end
  where id = p_tenant_id;

  if p_status = 'cancelled' then
    update public.subscriptions set status = 'cancelled' where tenant_id = p_tenant_id and status <> 'cancelled';
  end if;

  insert into public.audit_log (tenant_id, actor_user_id, actor_kind, action, target_type, target_id, changes, reason)
  values (p_tenant_id, p_actor, 'platform_admin',
          case p_status when 'active' then 'tenant.reactivated' when 'suspended' then 'tenant.suspended' else 'tenant.cancelled' end,
          'tenant', p_tenant_id::text, jsonb_build_object('from', v_from, 'to', p_status), v_reason);

  insert into public.events (tenant_id, type, entity_type, entity_id, payload, actor_kind, actor_id)
  values (p_tenant_id,
          case p_status when 'active' then 'tenant.reactivated' when 'suspended' then 'tenant.suspended' else 'tenant.cancelled' end,
          'tenant', p_tenant_id, jsonb_build_object('from', v_from), 'platform_admin', p_actor);

  return p_status;
end;
$$;

-- -----------------------------------------------------------------------------
-- Registrar un pago manual (link de Mercado Pago, transferencia, efectivo) y
-- extender el período. Deja la suscripción y el comercio activos.
-- -----------------------------------------------------------------------------
create function private.admin_record_payment(
  p_actor uuid, p_tenant_id uuid, p_amount bigint, p_method text,
  p_reference text, p_notes text, p_months integer
)
returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  v_sub     public.subscriptions;
  v_status  text;
  v_new_end timestamptz;
  v_payment uuid;
begin
  perform private.assert_superadmin(p_actor);
  if p_amount is null or p_amount <= 0 or p_months is null or p_months not between 1 and 12
     or p_method not in ('mp_link', 'transfer', 'cash', 'other')
     or char_length(coalesce(p_reference, '')) > 200 or char_length(coalesce(p_notes, '')) > 1000 then
    raise exception 'invalid_payment' using errcode = 'P0001';
  end if;

  select t.status into v_status from public.tenants t where t.id = p_tenant_id for update;
  if not found then
    raise exception 'tenant_not_found' using errcode = 'P0001';
  end if;
  if v_status = 'cancelled' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;

  select * into v_sub from public.subscriptions s
  where s.tenant_id = p_tenant_id and s.status <> 'cancelled' for update;
  if not found then
    raise exception 'no_subscription' using errcode = 'P0001';
  end if;

  v_new_end := greatest(v_sub.current_period_end, now()) + make_interval(months => p_months);

  insert into public.billing_payments (tenant_id, subscription_id, amount, paid_at, method, reference, notes, recorded_by)
  values (p_tenant_id, v_sub.id, p_amount, now(), p_method, nullif(btrim(p_reference), ''), nullif(btrim(p_notes), ''), p_actor)
  returning id into v_payment;

  update public.subscriptions
  set status = 'active', current_period_end = v_new_end,
      current_period_start = case when v_sub.status = 'trialing' then now() else current_period_start end
  where id = v_sub.id;

  update public.tenants
  set status = 'active', status_reason = null, trial_ends_at = null
  where id = p_tenant_id;

  insert into public.audit_log (tenant_id, actor_user_id, actor_kind, action, target_type, target_id, changes)
  values (p_tenant_id, p_actor, 'platform_admin', 'subscription.paid', 'billing_payment', v_payment::text,
          jsonb_build_object('amount', p_amount, 'method', p_method, 'months', p_months,
                             'period_end', v_new_end, 'tenant_status_from', v_status));

  insert into public.events (tenant_id, type, entity_type, entity_id, payload, actor_kind, actor_id)
  values (p_tenant_id, 'subscription.paid', 'billing_payment', v_payment,
          jsonb_build_object('amount', p_amount, 'months', p_months), 'platform_admin', p_actor);

  return v_new_end;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cambiar de plan (con motivo). No deja bajar a un plan con menos productos de los
-- que el comercio ya tiene.
-- -----------------------------------------------------------------------------
create function private.admin_change_plan(p_actor uuid, p_tenant_id uuid, p_plan_id text, p_reason text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_reason text;
  v_sub    public.subscriptions;
  v_plan   public.plans;
  v_count  integer;
begin
  perform private.assert_superadmin(p_actor);
  v_reason := private.require_reason(p_reason);

  select * into v_plan from public.plans p where p.id = p_plan_id;
  if not found then
    raise exception 'invalid_plan' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.tenants t where t.id = p_tenant_id) then
    raise exception 'tenant_not_found' using errcode = 'P0001';
  end if;
  select * into v_sub from public.subscriptions s
  where s.tenant_id = p_tenant_id and s.status <> 'cancelled' for update;
  if not found then
    raise exception 'no_subscription' using errcode = 'P0001';
  end if;
  if v_sub.plan_id = p_plan_id then
    return p_plan_id;
  end if;

  select count(*) into v_count from public.catalog_products p where p.tenant_id = p_tenant_id;
  if v_plan.max_products is not null and v_count > v_plan.max_products then
    raise exception 'over_plan_limit' using errcode = 'P0001';
  end if;

  update public.subscriptions set plan_id = p_plan_id where id = v_sub.id;

  insert into public.audit_log (tenant_id, actor_user_id, actor_kind, action, target_type, target_id, changes, reason)
  values (p_tenant_id, p_actor, 'platform_admin', 'subscription.plan_changed', 'subscription', v_sub.id::text,
          jsonb_build_object('from', v_sub.plan_id, 'to', p_plan_id), v_reason);

  insert into public.events (tenant_id, type, entity_type, entity_id, payload, actor_kind, actor_id)
  values (p_tenant_id, 'subscription.plan_changed', 'subscription', v_sub.id,
          jsonb_build_object('from', v_sub.plan_id, 'to', p_plan_id), 'platform_admin', p_actor);

  return p_plan_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Extender el vencimiento sin pago (por ejemplo, unos días más de prueba), con motivo.
-- -----------------------------------------------------------------------------
create function private.admin_extend_period(p_actor uuid, p_tenant_id uuid, p_days integer, p_reason text)
returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  v_reason  text;
  v_sub     public.subscriptions;
  v_new_end timestamptz;
begin
  perform private.assert_superadmin(p_actor);
  v_reason := private.require_reason(p_reason);
  if p_days is null or p_days not between 1 and 90 then
    raise exception 'invalid_days' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.tenants t where t.id = p_tenant_id) then
    raise exception 'tenant_not_found' using errcode = 'P0001';
  end if;
  select * into v_sub from public.subscriptions s
  where s.tenant_id = p_tenant_id and s.status <> 'cancelled' for update;
  if not found then
    raise exception 'no_subscription' using errcode = 'P0001';
  end if;

  v_new_end := greatest(v_sub.current_period_end, now()) + make_interval(days => p_days);
  update public.subscriptions set current_period_end = v_new_end where id = v_sub.id;
  update public.tenants set trial_ends_at = v_new_end where id = p_tenant_id and status = 'trial';

  insert into public.audit_log (tenant_id, actor_user_id, actor_kind, action, target_type, target_id, changes, reason)
  values (p_tenant_id, p_actor, 'platform_admin', 'subscription.extended', 'subscription', v_sub.id::text,
          jsonb_build_object('days', p_days, 'period_end', v_new_end), v_reason);

  return v_new_end;
end;
$$;

-- -----------------------------------------------------------------------------
-- Modo soporte (solo lectura): cada entrada a un comercio queda en su auditoría
-- (el dueño ve cuándo entró soporte). Lo pueden usar superadmin y soporte.
-- -----------------------------------------------------------------------------
create function private.admin_log_support_view(p_actor uuid, p_tenant_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_actor is null or not exists (select 1 from public.platform_admins a where a.user_id = p_actor) then
    raise exception 'not_superadmin' using errcode = 'P0001';
  end if;
  insert into public.audit_log (tenant_id, actor_user_id, actor_kind, action, target_type, target_id)
  values (p_tenant_id, p_actor, 'platform_admin', 'support.viewed', 'tenant', p_tenant_id::text);
end;
$$;

-- -----------------------------------------------------------------------------
-- Tarea diaria (diseño, sección 9). Idempotente: correrla dos veces no cambia nada.
--   1. prueba vencida o período vencido sin pago      → past_due
--   2. past_due desde hace más de 5 días                → suspended (motivo automático)
--   3. limpia ventanas de rate_limits de más de 1 día
-- Devuelve los comercios que cambiaron (para invalidar su caché) y a quiénes habría
-- que avisar (pruebas que vencen en 4 días y en 1 día).
-- -----------------------------------------------------------------------------
create function private.daily_maintenance()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_past_due  uuid[];
  v_suspended uuid[];
  v_cleaned   integer;
  v_notify    jsonb;
begin
  -- 1. Vencidos sin pago → past_due
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

  -- 2. past_due con más de 5 días de gracia → suspended
  with overdue as (
    select t.id
    from public.tenants t
    join public.subscriptions s on s.tenant_id = t.id and s.status <> 'cancelled'
    where t.status = 'past_due'
      and s.current_period_end < now() - interval '5 days'
    for update of t
  ), moved as (
    update public.tenants t set status = 'suspended', status_reason = 'Falta de pago (suspensión automática)'
    from overdue o where t.id = o.id
    returning t.id
  )
  select coalesce(array_agg(id), '{}') into v_suspended from moved;

  insert into public.audit_log (tenant_id, actor_kind, action, target_type, target_id, changes)
  select id, 'system', 'tenant.past_due', 'tenant', id::text, '{"by": "daily_maintenance"}'::jsonb
  from unnest(v_past_due) as id;
  insert into public.audit_log (tenant_id, actor_kind, action, target_type, target_id, changes)
  select id, 'system', 'tenant.suspended', 'tenant', id::text, '{"by": "daily_maintenance"}'::jsonb
  from unnest(v_suspended) as id;
  insert into public.events (tenant_id, type, entity_type, entity_id, actor_kind)
  select id, 'tenant.past_due', 'tenant', id, 'system' from unnest(v_past_due) as id;
  insert into public.events (tenant_id, type, entity_type, entity_id, actor_kind)
  select id, 'tenant.suspended', 'tenant', id, 'system' from unnest(v_suspended) as id;

  -- 3. Limpieza de límites de frecuencia
  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics v_cleaned = row_count;

  -- Avisos: pruebas que vencen en 4 días o en 1 día (el envío del correo es de la app).
  select coalesce(jsonb_agg(jsonb_build_object('tenant_id', t.id, 'name', t.name,
           'days_left', (s.current_period_end::date - now()::date))), '[]'::jsonb)
  into v_notify
  from public.tenants t
  join public.subscriptions s on s.tenant_id = t.id and s.status = 'trialing'
  where t.status = 'trial' and (s.current_period_end::date - now()::date) in (4, 1);

  return jsonb_build_object(
    'past_due', to_jsonb(v_past_due),
    'suspended', to_jsonb(v_suspended),
    'rate_limits_cleaned', v_cleaned,
    'notify_trial_ending', v_notify
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos: solo service_role, y envoltorios public.* (mismo criterio que create_order).
-- -----------------------------------------------------------------------------
revoke execute on function private.assert_superadmin(uuid) from public, anon, authenticated;
revoke execute on function private.require_reason(text) from public, anon, authenticated;
revoke execute on function private.admin_set_tenant_status(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function private.admin_record_payment(uuid, uuid, bigint, text, text, text, integer) from public, anon, authenticated;
revoke execute on function private.admin_change_plan(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function private.admin_extend_period(uuid, uuid, integer, text) from public, anon, authenticated;
revoke execute on function private.admin_log_support_view(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.daily_maintenance() from public, anon, authenticated;

grant execute on function private.assert_superadmin(uuid) to service_role;
grant execute on function private.require_reason(text) to service_role;
grant execute on function private.admin_set_tenant_status(uuid, uuid, text, text) to service_role;
grant execute on function private.admin_record_payment(uuid, uuid, bigint, text, text, text, integer) to service_role;
grant execute on function private.admin_change_plan(uuid, uuid, text, text) to service_role;
grant execute on function private.admin_extend_period(uuid, uuid, integer, text) to service_role;
grant execute on function private.admin_log_support_view(uuid, uuid) to service_role;
grant execute on function private.daily_maintenance() to service_role;

create function public.admin_set_tenant_status(p_actor uuid, p_tenant_id uuid, p_status text, p_reason text)
returns text language sql volatile set search_path = ''
as $$ select private.admin_set_tenant_status(p_actor, p_tenant_id, p_status, p_reason); $$;

create function public.admin_record_payment(
  p_actor uuid, p_tenant_id uuid, p_amount bigint, p_method text, p_reference text, p_notes text, p_months integer)
returns timestamptz language sql volatile set search_path = ''
as $$ select private.admin_record_payment(p_actor, p_tenant_id, p_amount, p_method, p_reference, p_notes, p_months); $$;

create function public.admin_change_plan(p_actor uuid, p_tenant_id uuid, p_plan_id text, p_reason text)
returns text language sql volatile set search_path = ''
as $$ select private.admin_change_plan(p_actor, p_tenant_id, p_plan_id, p_reason); $$;

create function public.admin_extend_period(p_actor uuid, p_tenant_id uuid, p_days integer, p_reason text)
returns timestamptz language sql volatile set search_path = ''
as $$ select private.admin_extend_period(p_actor, p_tenant_id, p_days, p_reason); $$;

create function public.admin_log_support_view(p_actor uuid, p_tenant_id uuid)
returns void language sql volatile set search_path = ''
as $$ select private.admin_log_support_view(p_actor, p_tenant_id); $$;

create function public.daily_maintenance()
returns jsonb language sql volatile set search_path = ''
as $$ select private.daily_maintenance(); $$;

revoke execute on function public.admin_set_tenant_status(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.admin_record_payment(uuid, uuid, bigint, text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.admin_change_plan(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.admin_extend_period(uuid, uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.admin_log_support_view(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.daily_maintenance() from public, anon, authenticated;

grant execute on function public.admin_set_tenant_status(uuid, uuid, text, text) to service_role;
grant execute on function public.admin_record_payment(uuid, uuid, bigint, text, text, text, integer) to service_role;
grant execute on function public.admin_change_plan(uuid, uuid, text, text) to service_role;
grant execute on function public.admin_extend_period(uuid, uuid, integer, text) to service_role;
grant execute on function public.admin_log_support_view(uuid, uuid) to service_role;
grant execute on function public.daily_maintenance() to service_role;

comment on function public.admin_set_tenant_status(uuid, uuid, text, text) is 'Solo service_role (panel central). Delegada en private.admin_set_tenant_status.';
comment on function public.admin_record_payment(uuid, uuid, bigint, text, text, text, integer) is 'Solo service_role (panel central). Delegada en private.admin_record_payment.';
comment on function public.admin_change_plan(uuid, uuid, text, text) is 'Solo service_role (panel central). Delegada en private.admin_change_plan.';
comment on function public.admin_extend_period(uuid, uuid, integer, text) is 'Solo service_role (panel central). Delegada en private.admin_extend_period.';
comment on function public.admin_log_support_view(uuid, uuid) is 'Solo service_role (modo soporte). Delegada en private.admin_log_support_view.';
comment on function public.daily_maintenance() is 'Solo service_role (cron diario). Delegada en private.daily_maintenance.';

-- =============================================================================
-- Lecturas del panel central (conteos y filtros por excepción, paginados en la base)
-- =============================================================================

-- Resumen: comercios por estado, pruebas por vencer, cobros pendientes, pedidos y altas.
create function private.admin_overview()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                  from (select status, count(*) as n from public.tenants group by status) s),
    'trials_ending_7d', (select count(*) from public.tenants t
                         join public.subscriptions s on s.tenant_id = t.id and s.status = 'trialing'
                         where t.status = 'trial' and s.current_period_end < now() + interval '7 days'),
    'past_due_amount', (select coalesce(sum(p.price_ars), 0) from public.tenants t
                        join public.subscriptions s on s.tenant_id = t.id and s.status <> 'cancelled'
                        join public.plans p on p.id = s.plan_id
                        where t.status = 'past_due'),
    'renewals_7d', (select count(*) from public.subscriptions s
                    where s.status in ('active', 'trialing') and s.current_period_end between now() and now() + interval '7 days'),
    'orders_7d', (select count(*) from public.orders o where o.created_at > now() - interval '7 days'),
    'orders_prev_7d', (select count(*) from public.orders o
                       where o.created_at between now() - interval '14 days' and now() - interval '7 days'),
    'signups_by_week', (select coalesce(jsonb_agg(jsonb_build_object('week', w.week, 'count', w.n) order by w.week), '[]'::jsonb)
                        from (select date_trunc('week', g)::date as week,
                                     (select count(*) from public.tenants t
                                      where t.created_at >= date_trunc('week', g)
                                        and t.created_at < date_trunc('week', g) + interval '7 days') as n
                              from generate_series(now() - interval '7 weeks', now(), interval '1 week') g) w)
  );
$$;

/*
 * Lista de comercios con sus números (tabla del panel central).
 * p_filter: all | trial_ending | past_due | suspended | no_orders_14d | no_products
 * p_search: nombre, slug o WhatsApp (sin distinguir mayúsculas). Cada fila trae el total.
 */
create function private.admin_tenants(p_search text, p_filter text, p_limit integer, p_offset integer)
returns table (
  id uuid, slug text, name text, status text, business_type text, created_at timestamptz,
  published boolean, plan_id text, subscription_status text, period_end timestamptz,
  whatsapp_phone text, published_products bigint, orders_30d bigint, last_order_at timestamptz,
  total bigint
)
language sql
stable
set search_path = ''
as $$
  with params as (
    select nullif(btrim(coalesce(p_search, '')), '') as q,
           nullif(regexp_replace(coalesce(p_search, ''), '[^0-9]', '', 'g'), '') as digits
  ), base as (
    select t.id, t.slug, t.name, t.status, t.business_type, t.created_at,
           t.published_at is not null as published,
           s.plan_id, s.status as subscription_status, s.current_period_end as period_end,
           st.whatsapp_phone,
           (select count(*) from public.catalog_products p where p.tenant_id = t.id and p.is_published) as published_products,
           (select count(*) from public.orders o where o.tenant_id = t.id and o.created_at > now() - interval '30 days') as orders_30d,
           (select max(o.created_at) from public.orders o where o.tenant_id = t.id) as last_order_at
    from public.tenants t
    cross join params
    left join public.subscriptions s on s.tenant_id = t.id and s.status <> 'cancelled'
    left join public.tenant_settings st on st.tenant_id = t.id
    where params.q is null
       or t.name ilike '%' || params.q || '%'
       or t.slug ilike '%' || params.q || '%'
       or (params.digits is not null and length(params.digits) >= 4
           and replace(coalesce(st.whatsapp_phone, ''), '+', '') like '%' || params.digits || '%')
  ), filtered as (
    select * from base b
    where case coalesce(p_filter, 'all')
      when 'all' then true
      when 'trial_ending' then b.status = 'trial' and b.period_end < now() + interval '7 days'
      when 'past_due' then b.status = 'past_due'
      when 'suspended' then b.status in ('suspended', 'cancelled')
      when 'no_orders_14d' then b.status in ('trial', 'active', 'past_due') and b.published
                                and coalesce(b.last_order_at, '-infinity'::timestamptz) < now() - interval '14 days'
      when 'no_products' then b.status in ('trial', 'active', 'past_due') and b.published_products = 0
      else false
    end
  )
  select f.*, count(*) over () as total
  from filtered f
  order by
    case f.status when 'past_due' then 0 when 'trial' then 1 when 'active' then 2 when 'suspended' then 3 else 4 end,
    f.period_end nulls last, f.name
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function private.admin_overview() from public, anon, authenticated;
revoke execute on function private.admin_tenants(text, text, integer, integer) from public, anon, authenticated;
grant execute on function private.admin_overview() to service_role;
grant execute on function private.admin_tenants(text, text, integer, integer) to service_role;

create function public.admin_overview()
returns jsonb language sql stable set search_path = ''
as $$ select private.admin_overview(); $$;

create function public.admin_tenants(p_search text, p_filter text, p_limit integer, p_offset integer)
returns table (
  id uuid, slug text, name text, status text, business_type text, created_at timestamptz,
  published boolean, plan_id text, subscription_status text, period_end timestamptz,
  whatsapp_phone text, published_products bigint, orders_30d bigint, last_order_at timestamptz,
  total bigint
)
language sql stable set search_path = ''
as $$ select * from private.admin_tenants(p_search, p_filter, p_limit, p_offset); $$;

revoke execute on function public.admin_overview() from public, anon, authenticated;
revoke execute on function public.admin_tenants(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_overview() to service_role;
grant execute on function public.admin_tenants(text, text, integer, integer) to service_role;

comment on function public.admin_overview() is 'Solo service_role (panel central). Delegada en private.admin_overview.';
comment on function public.admin_tenants(text, text, integer, integer) is 'Solo service_role (panel central). Delegada en private.admin_tenants.';
