-- =============================================================================
-- Capa 2 · Panel central: funciones admin auditadas y tarea diaria (diseño, sección 9)
-- Usa supabase/seed.sql: admin@example.com (5555…) es superadmin; dueño de Alfa (1111…).
--   Alfa: activo, Pro · Beta: prueba, Base · Gamma: suspendido, Base (past_due)
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Constantes
create temp table k (name text primary key, id uuid) on commit drop;
insert into k values
  ('admin', '55555555-5555-4555-8555-555555555555'),
  ('owner', '11111111-1111-4111-8111-111111111111'),
  ('alfa',  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('beta',  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('gamma', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
grant select on k to anon, authenticated, service_role;
create function pg_temp.k(p text) returns uuid language sql stable as $$ select id from k where name = p $$;

-- =============================================================================
-- Nadie fuera del servidor puede llamarlas
-- =============================================================================
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok($$ select public.admin_set_tenant_status(pg_temp.k('admin'), pg_temp.k('alfa'), 'suspended', 'prueba') $$,
                 '42501', null, 'anon: no suspende comercios');
select throws_ok($$ select public.daily_maintenance() $$, '42501', null, 'anon: no corre la tarea diaria');

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', '55555555-5555-4555-8555-555555555555', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok($$ select public.admin_set_tenant_status(pg_temp.k('admin'), pg_temp.k('alfa'), 'suspended', 'prueba') $$,
                 '42501', null, 'superadmin con su sesión: tampoco (solo el servidor)');
select throws_ok($$ select public.admin_record_payment(pg_temp.k('admin'), pg_temp.k('alfa'), 100, 'cash', null, null, 1) $$,
                 '42501', null, 'authenticated: no registra pagos');

reset role;
set local role service_role;

-- =============================================================================
-- Solo superadmin y siempre con motivo
-- =============================================================================
select throws_ok($$ select public.admin_set_tenant_status(pg_temp.k('owner'), pg_temp.k('alfa'), 'suspended', 'prueba') $$,
                 'P0001', 'not_superadmin', 'un dueño no es superadmin');
select throws_ok($$ select public.admin_set_tenant_status(null, pg_temp.k('alfa'), 'suspended', 'prueba') $$,
                 'P0001', 'not_superadmin', 'sin actor no hay acción');
select throws_ok($$ select public.admin_set_tenant_status(pg_temp.k('admin'), pg_temp.k('alfa'), 'suspended', '  ') $$,
                 'P0001', 'reason_required', 'suspender sin motivo se rechaza');
select throws_ok($$ select public.admin_set_tenant_status(pg_temp.k('admin'), pg_temp.k('alfa'), 'trial', 'motivo') $$,
                 'P0001', 'invalid_status', 'estado no permitido');
select throws_ok($$ select public.admin_set_tenant_status(pg_temp.k('admin'), '9a000000-0000-4000-8000-000000000000', 'suspended', 'motivo') $$,
                 'P0001', 'tenant_not_found', 'comercio inexistente');

-- =============================================================================
-- Suspender y reactivar
-- =============================================================================
select is(public.admin_set_tenant_status(pg_temp.k('admin'), pg_temp.k('alfa'), 'suspended', 'Pedido del dueño'), 'suspended',
          'suspende a Alfa');
select is(public.storefront_by_host('alfa.localhost'), '{"available": false}'::jsonb, 'suspendido: el catálogo no está disponible');
select is((select status_reason from public.tenants where id = pg_temp.k('alfa')), 'Pedido del dueño', 'guarda el motivo');
select is(public.admin_set_tenant_status(pg_temp.k('admin'), pg_temp.k('alfa'), 'active', 'Ya está todo bien'), 'active',
          'reactiva a Alfa');
select is(public.storefront_by_host('alfa.localhost') ->> 'available', 'true', 'reactivado y todavía publicado: vuelve a verse');

reset role;
select is(
  (select string_agg(action || ':' || actor_kind || ':' || coalesce(reason, ''), ',' order by id) from public.audit_log
   where tenant_id = pg_temp.k('alfa') and action like 'tenant.%' and actor_user_id = pg_temp.k('admin')),
  'tenant.suspended:platform_admin:Pedido del dueño,tenant.reactivated:platform_admin:Ya está todo bien',
  'cada cambio queda en audit_log con el actor y el motivo'
);
select is(
  (select count(*)::int from public.events where tenant_id = pg_temp.k('alfa') and type in ('tenant.suspended', 'tenant.reactivated')),
  2, 'y emite sus eventos'
);
set local role service_role;

-- =============================================================================
-- Extender, cambiar de plan y cancelar (Beta)
-- =============================================================================
select ok(
  public.admin_extend_period(pg_temp.k('admin'), pg_temp.k('beta'), 7, 'Le damos una semana más') > now() + interval '16 days',
  'extiende la prueba de Beta 7 días'
);
reset role;
select ok((select trial_ends_at > now() + interval '16 days' from public.tenants where id = pg_temp.k('beta')),
          'en prueba, también corre trial_ends_at');
update public.plans set max_products = 1 where id = 'pro';
set local role service_role;
select throws_ok($$ select public.admin_change_plan(pg_temp.k('admin'), pg_temp.k('beta'), 'pro', 'Sube de plan') $$,
                 'P0001', 'over_plan_limit', 'no cambia a un plan con menos productos de los que tiene');
reset role;
update public.plans set max_products = null where id = 'pro';
set local role service_role;
select is(public.admin_change_plan(pg_temp.k('admin'), pg_temp.k('beta'), 'pro', 'Sube de plan'), 'pro', 'cambia a Pro');
select throws_ok($$ select public.admin_change_plan(pg_temp.k('admin'), pg_temp.k('beta'), 'gold', 'x y z') $$,
                 'P0001', 'invalid_plan', 'plan inexistente');
select is(public.admin_set_tenant_status(pg_temp.k('admin'), pg_temp.k('beta'), 'cancelled', 'Dejó de usarlo'), 'cancelled', 'cancela a Beta');
reset role;
select is((select count(*)::int from public.subscriptions where tenant_id = pg_temp.k('beta') and status <> 'cancelled'), 0,
          'cancelar cancela la suscripción');
set local role service_role;
select throws_ok($$ select public.admin_set_tenant_status(pg_temp.k('admin'), pg_temp.k('beta'), 'active', 'Volvió') $$,
                 'P0001', 'invalid_status', 'un comercio cancelado no se reactiva desde el panel');
select throws_ok($$ select public.admin_record_payment(pg_temp.k('admin'), pg_temp.k('beta'), 100, 'cash', null, null, 1) $$,
                 'P0001', 'invalid_status', 'ni recibe pagos');

-- =============================================================================
-- Registrar un pago (Gamma, suspendida por falta de pago)
-- =============================================================================
select throws_ok($$ select public.admin_record_payment(pg_temp.k('admin'), pg_temp.k('gamma'), 0, 'cash', null, null, 1) $$,
                 'P0001', 'invalid_payment', 'monto cero');
select throws_ok($$ select public.admin_record_payment(pg_temp.k('admin'), pg_temp.k('gamma'), 100, 'bitcoin', null, null, 1) $$,
                 'P0001', 'invalid_payment', 'medio de pago desconocido');
-- Una sola llamada: `x between a and b` evaluaría la función dos veces (registraría dos pagos).
create temp table paid on commit drop as
  select public.admin_record_payment(pg_temp.k('admin'), pg_temp.k('gamma'), 2490000, 'mp_link', 'MP-123', 'Pagó 2 meses', 2) as period_end;
select ok(
  (select period_end between now() + interval '58 days' and now() + interval '63 days' from paid),
  'registra 2 meses: el período corre desde hoy (estaba vencido)'
);
reset role;
select is((select status || ' ' || coalesce(status_reason, '-') from public.tenants where id = pg_temp.k('gamma')), 'active -',
          'el pago reactiva el comercio');
select is((select status from public.subscriptions where tenant_id = pg_temp.k('gamma')), 'active', 'y la suscripción');
select is((select amount::text || ' ' || method || ' ' || reference from public.billing_payments
           where tenant_id = pg_temp.k('gamma') and reference = 'MP-123'), '2490000 mp_link MP-123',
          'billing_payments: el pago con quién lo registró');
select is((select count(*)::int from public.audit_log where tenant_id = pg_temp.k('gamma') and action = 'subscription.paid'), 1,
          'audit_log: subscription.paid');

-- =============================================================================
-- Modo soporte
-- =============================================================================
set local role service_role;
select throws_ok($$ select public.admin_log_support_view(pg_temp.k('owner'), pg_temp.k('alfa')) $$,
                 'P0001', 'not_superadmin', 'un dueño no entra en modo soporte');
select lives_ok($$ select public.admin_log_support_view(pg_temp.k('admin'), pg_temp.k('alfa')) $$, 'el superadmin entra en modo soporte');
reset role;
select is((select count(*)::int from public.audit_log where tenant_id = pg_temp.k('alfa') and action = 'support.viewed'), 1,
          'la entrada de soporte queda en la auditoría del comercio');

-- El dueño de Alfa la ve en su auditoría (RLS de audit_log: dueño lee lo de su comercio).
select set_config('request.jwt.claims',
  json_build_object('sub', '11111111-1111-4111-8111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*)::int from public.audit_log where action = 'support.viewed'), 1, 'el dueño ve cuándo entró soporte');
reset role;

-- =============================================================================
-- Lecturas del panel central (antes de la tarea diaria, con los estados de arriba:
-- Alfa activa, Beta cancelada, Gamma activa por el pago)
-- =============================================================================
select set_config('request.jwt.claims',
  json_build_object('sub', '55555555-5555-4555-8555-555555555555', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok($$ select * from public.admin_tenants(null, 'all', 25, 0) $$, '42501', null, 'authenticated: no lista comercios');
select throws_ok($$ select public.admin_overview() $$, '42501', null, 'authenticated: no ve el resumen');
reset role;
set local role service_role;
select is((select count(*)::int from public.admin_tenants(null, 'all', 25, 0)), 3, 'admin_tenants: los 3 comercios');
select is((select total::int from public.admin_tenants(null, 'all', 1, 0) limit 1), 3, 'admin_tenants: total para paginar');
select is((select slug from public.admin_tenants('BURGER', 'all', 25, 0)), 'alfa', 'admin_tenants: busca por nombre sin mayúsculas');
select is((select slug from public.admin_tenants('2954000002', 'all', 25, 0)), 'beta', 'admin_tenants: busca por WhatsApp');
select is((select slug from public.admin_tenants(null, 'suspended', 25, 0)), 'beta', 'admin_tenants: suspendidos incluye cancelados');
select is((select orders_30d::int from public.admin_tenants('alfa', 'all', 25, 0)), 2, 'admin_tenants: pedidos de 30 días');
select is((select count(*)::int from public.admin_tenants(null, 'cualquiera', 25, 0)), 0, 'admin_tenants: filtro desconocido no devuelve nada');
select is((public.admin_overview() ->> 'orders_7d')::int, 3, 'admin_overview: pedidos de 7 días');
select is(public.admin_overview() -> 'by_status' ->> 'cancelled', '1', 'admin_overview: comercios por estado');
reset role;

-- =============================================================================
-- Tarea diaria
-- =============================================================================
-- Alfa: período vencido ayer → past_due. Gamma: vencida hace 6 días y en past_due → sigue en
-- past_due: la tarea diaria nunca suspende sola (cobro manual, decisión del 2026-11-21);
-- suspender es una acción del panel central.
update public.subscriptions set current_period_end = now() - interval '1 day' where tenant_id = pg_temp.k('alfa');
update public.tenants set status = 'past_due' where id = pg_temp.k('gamma');
update public.subscriptions set current_period_end = now() - interval '6 days', status = 'past_due' where tenant_id = pg_temp.k('gamma');
insert into public.rate_limits (key, window_start, hits) values ('vieja', now() - interval '3 days', 1);

set local role service_role;
create temp table run1 on commit drop as select public.daily_maintenance() as r;
reset role;
select is((select r -> 'past_due' from run1), jsonb_build_array(pg_temp.k('alfa')), 'tarea diaria: Alfa pasa a pago pendiente');
select is((select r ? 'suspended' from run1), false, 'tarea diaria: ya no informa suspensiones');
select is((select r ? 'notify_trial_ending' from run1), false, 'tarea diaria: ya no calcula avisos por correo');
select ok((select (r ->> 'rate_limits_cleaned')::int >= 1 from run1), 'tarea diaria: limpia rate_limits viejos');
select is((select status from public.tenants where id = pg_temp.k('alfa')), 'past_due', 'Alfa en past_due');
select is((select status from public.tenants where id = pg_temp.k('gamma')), 'past_due',
          'Gamma sigue en pago pendiente: la tarea diaria no suspende');
select is((select count(*)::int from public.audit_log where actor_kind = 'system' and action = 'tenant.suspended'), 0,
          'ninguna suspensión automática');
select is((select count(*)::int from public.audit_log where actor_kind = 'system' and action = 'tenant.past_due'), 1,
          'el paso a pago pendiente queda auditado como system');

set local role service_role;
create temp table run2 on commit drop as select public.daily_maintenance() as r;
reset role;
select is((select r -> 'past_due' from run2), '[]'::jsonb, 'correrla de nuevo no cambia nada (idempotente)');

-- =============================================================================
-- Alta asistida
-- =============================================================================
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '77777777-7777-4777-8777-777777777771', 'authenticated', 'authenticated',
        'invitado@example.com', '', null, '{}', '{}', now(), now(), '', '', '', '');

set local role service_role;
select is(public.admin_user_id_by_email('INVITADO@example.com '), '77777777-7777-4777-8777-777777777771'::uuid,
          'alta asistida: encuentra al dueño por email');
select is(public.admin_user_id_by_email('nadie@example.com'), null, 'alta asistida: email sin cuenta → null');
select throws_ok(
  $$ select public.admin_provision_tenant(pg_temp.k('owner'), '77777777-7777-4777-8777-777777777771',
       '{"name":"Kiosco Asistido","slug":"kiosco-asistido","business_type":"general","whatsapp_phone":"+5492954000055"}', 'localhost') $$,
  'P0001', 'not_superadmin', 'alta asistida: solo superadmin'
);
select throws_ok(
  $$ select public.admin_provision_tenant(pg_temp.k('admin'), '9a000000-0000-4000-8000-000000000000',
       '{"name":"Kiosco Asistido","slug":"kiosco-asistido","business_type":"general","whatsapp_phone":"+5492954000055"}', 'localhost') $$,
  'P0001', 'owner_not_found', 'alta asistida: dueño inexistente'
);
select is(
  public.admin_provision_tenant(pg_temp.k('admin'), '77777777-7777-4777-8777-777777777771',
    '{"name":"Kiosco Asistido","slug":"kiosco-asistido","business_type":"general","whatsapp_phone":"+5492954000055"}', 'localhost') ->> 'slug',
  'kiosco-asistido', 'alta asistida: crea el comercio con un dueño que todavía no confirmó'
);
select is(
  public.admin_provision_tenant(pg_temp.k('admin'), pg_temp.k('owner'),
    '{"name":"Alfa Sucursal","slug":"alfa-sucursal","business_type":"gastronomia","whatsapp_phone":"+5492954000056"}', 'localhost') ->> 'created',
  'true', 'alta asistida: un dueño puede tener un segundo comercio'
);
reset role;
select is(
  (select m.role || ' ' || m.invited_by::text from public.tenant_members m join public.tenants t on t.id = m.tenant_id where t.slug = 'kiosco-asistido'),
  'owner 55555555-5555-4555-8555-555555555555', 'alta asistida: dueño invitado por el superadmin'
);
select is(
  (select a.actor_kind || ' ' || a.actor_user_id::text from public.audit_log a join public.tenants t on t.id = a.tenant_id
   where t.slug = 'kiosco-asistido' and a.action = 'tenant.created'),
  'platform_admin 55555555-5555-4555-8555-555555555555', 'alta asistida: auditada con el actor del panel central'
);

-- El autoservicio sigue igual: retoma el comercio existente.
set local role service_role;
select is(
  public.provision_tenant(pg_temp.k('owner'), '{"name":"Otro","slug":"otro-mas","business_type":"general","whatsapp_phone":"+5492954000057"}', 'localhost') ->> 'created',
  'false', 'autoservicio: un dueño existente retoma su comercio (no crea otro)'
);
reset role;

select * from finish();
rollback;
