-- =============================================================================
-- Capa 2 · RLS por rol en las tablas del núcleo (diseño, sección 13)
-- Usa los datos de supabase/seed.sql. Todo corre en una transacción que se
-- descarta al final.
--
--   Alfa  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa   dueño 1111…1111, staff 1111…1112
--   Beta  bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb   dueña 2222…2221
--   Gamma cccccccc-cccc-4ccc-8ccc-cccccccccccc   dueño 3333…3331 (suspendido)
--   Sin comercio 4444…4444 · Superadmin 5555…5555
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Simula una sesión de Supabase: auth.uid() lee el claim "sub".
create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

-- =============================================================================
-- Anónimo (clave pública, sin sesión)
-- =============================================================================
select pg_temp.logout();
set local role anon;

select ok((select count(*) from public.plans) = 2, 'anon: lee los planes');
select ok((select count(*) from public.modules) > 0, 'anon: lee los módulos');
select ok((select count(*) from public.business_templates) > 0, 'anon: lee las plantillas');
select ok((select count(*) from public.reserved_slugs) > 0, 'anon: lee los slugs reservados');

select throws_ok(format('select * from public.%I', t), '42501', null, format('anon: sin acceso a %s', t))
from unnest(array[
  'tenants', 'profiles', 'tenant_members', 'tenant_invitations', 'platform_admins',
  'domains', 'subscriptions', 'billing_payments', 'tenant_modules', 'tenant_settings',
  'business_hours', 'events', 'audit_log', 'tenant_counters', 'rate_limits'
]) as t;

select throws_ok(
  $$ insert into public.tenants (slug, name, business_type) values ('nuevo', 'Nuevo', 'general') $$,
  '42501', null, 'anon: no puede crear comercios'
);
select throws_ok(
  $$ update public.plans set price_ars = 0 $$,
  '42501', null, 'anon: no puede cambiar precios de planes'
);

reset role;

-- =============================================================================
-- Dueño de Alfa
-- =============================================================================
select pg_temp.login('11111111-1111-4111-8111-111111111111');
set local role authenticated;

select results_eq('select id from public.tenants',
  $$ values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$, 'dueño Alfa: ve solo su comercio');

select results_eq(format('select distinct tenant_id from public.%I', t),
  $$ values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$, format('dueño Alfa: %s solo de Alfa', t))
from unnest(array[
  'domains', 'tenant_members', 'subscriptions', 'billing_payments', 'tenant_modules',
  'tenant_settings', 'business_hours', 'audit_log'
]) as t;

select is((select count(*)::int from public.tenant_members), 2, 'dueño Alfa: ve a los 2 miembros de Alfa');
select is((select count(*)::int from public.profiles), 2, 'dueño Alfa: ve su perfil y el de su staff, ninguno más');
select is_empty('select * from public.platform_admins', 'dueño Alfa: no figura como admin');
select throws_ok('select * from public.events', '42501', null, 'dueño Alfa: no lee events');
select throws_ok('select * from public.tenant_counters', '42501', null, 'dueño Alfa: no lee tenant_counters');

-- Configuración
with u as (
  update public.tenant_settings set tagline = 'Nueva frase'
  where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1
) select is(count(*)::int, 1, 'dueño Alfa: edita la configuración de Alfa') from u;

with u as (
  update public.tenant_settings set tagline = 'Hackeado'
  where tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1
) select is(count(*)::int, 0, 'dueño Alfa: no edita la configuración de Beta') from u;

select throws_ok(
  $$ update public.tenant_settings set tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501', null, 'dueño Alfa: no puede cambiar tenant_id (sin permiso de columna)'
);

-- Horarios
select lives_ok(
  $$ insert into public.business_hours (tenant_id, weekday, opens_at, closes_at)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, '12:00', '15:00') $$,
  'dueño Alfa: agrega un horario a Alfa'
);
select throws_ok(
  $$ insert into public.business_hours (tenant_id, weekday, opens_at, closes_at)
     values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, '12:00', '15:00') $$,
  '42501', null, 'dueño Alfa: no agrega horarios a Beta'
);
with d as (
  delete from public.business_hours where tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1
) select is(count(*)::int, 0, 'dueño Alfa: no borra horarios de Beta') from d;

-- Invitaciones (primero las que deben fallar por RLS)
select throws_ok(
  $$ insert into public.tenant_invitations (tenant_id, email, role, token_hash, invited_by)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'socio@example.com', 'owner', repeat('b', 64),
             '11111111-1111-4111-8111-111111111111') $$,
  '42501', null, 'dueño Alfa: no puede invitar a otro dueño'
);
select throws_ok(
  $$ insert into public.tenant_invitations (tenant_id, email, role, token_hash, invited_by)
     values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'intruso@example.com', 'staff', repeat('c', 64),
             '11111111-1111-4111-8111-111111111111') $$,
  '42501', null, 'dueño Alfa: no invita en Beta (y no se entera de su plan)'
);
select throws_ok(
  $$ insert into public.tenant_invitations (tenant_id, email, role, token_hash, invited_by)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'otro@example.com', 'staff', repeat('d', 64),
             '22222222-2222-4222-8222-222222222221') $$,
  '42501', null, 'dueño Alfa: no puede firmar una invitación como otro usuario'
);
select lives_ok(
  $$ insert into public.tenant_invitations (tenant_id, email, role, token_hash, invited_by)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'nuevo@example.com', 'staff', repeat('a', 64),
             '11111111-1111-4111-8111-111111111111') $$,
  'dueño Alfa: invita a un staff'
);
select throws_ok(
  $$ insert into public.tenant_invitations (tenant_id, email, role, token_hash, invited_by)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cuarto@example.com', 'staff', repeat('e', 64),
             '11111111-1111-4111-8111-111111111111') $$,
  'P0001', null, 'dueño Alfa: el plan Pro corta en 3 usuarios (2 miembros + 1 invitación)'
);

-- Miembros
savepoint quitar_staff;
with d as (
  delete from public.tenant_members where user_id = '11111111-1111-4111-8111-111111111112' returning 1
) select is(count(*)::int, 1, 'dueño Alfa: puede quitar a su staff') from d;
rollback to savepoint quitar_staff;

with d as (
  delete from public.tenant_members where user_id = '11111111-1111-4111-8111-111111111111' returning 1
) select is(count(*)::int, 0, 'dueño Alfa: no puede quitarse a sí mismo') from d;
with d as (
  delete from public.tenant_members where tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1
) select is(count(*)::int, 0, 'dueño Alfa: no quita miembros de Beta') from d;

-- Perfiles
with u as (
  update public.profiles set full_name = 'Yo' where id = '11111111-1111-4111-8111-111111111111' returning 1
) select is(count(*)::int, 1, 'dueño Alfa: edita su perfil') from u;
with u as (
  update public.profiles set full_name = 'Otro' where id = '11111111-1111-4111-8111-111111111112' returning 1
) select is(count(*)::int, 0, 'dueño Alfa: no edita el perfil de su staff') from u;

reset role;

-- =============================================================================
-- Staff de Alfa
-- =============================================================================
select pg_temp.login('11111111-1111-4111-8111-111111111112');
set local role authenticated;

select results_eq('select id from public.tenants',
  $$ values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$, 'staff Alfa: ve solo su comercio');
select ok((select count(*) from public.tenant_settings) = 1, 'staff Alfa: lee la configuración de Alfa');

select is_empty(format('select * from public.%I', t), format('staff Alfa: no ve %s (solo dueño)', t))
from unnest(array['subscriptions', 'billing_payments', 'tenant_invitations', 'audit_log']) as t;

with u as (
  update public.tenant_settings set tagline = 'Cambio de staff'
  where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1
) select is(count(*)::int, 0, 'staff Alfa: no edita la configuración') from u;

select throws_ok(
  $$ insert into public.business_hours (tenant_id, weekday, opens_at, closes_at)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, '09:00', '11:00') $$,
  '42501', null, 'staff Alfa: no edita horarios'
);
select throws_ok(
  $$ insert into public.tenant_invitations (tenant_id, email, role, token_hash, invited_by)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'amigo@example.com', 'staff', repeat('f', 64),
             '11111111-1111-4111-8111-111111111112') $$,
  '42501', null, 'staff Alfa: no invita usuarios'
);
with d as (
  delete from public.tenant_members where user_id = '11111111-1111-4111-8111-111111111111' returning 1
) select is(count(*)::int, 0, 'staff Alfa: no puede quitar al dueño') from d;

reset role;

-- =============================================================================
-- Dueña de Beta
-- =============================================================================
select pg_temp.login('22222222-2222-4222-8222-222222222221');
set local role authenticated;

select results_eq('select id from public.tenants',
  $$ values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid) $$, 'dueña Beta: ve solo su comercio');
select is_empty(
  $$ select * from public.tenant_settings where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'dueña Beta: no ve la configuración de Alfa aunque la pida por id'
);
select is_empty(
  $$ select * from public.billing_payments where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'dueña Beta: no ve los pagos de Alfa'
);
select is((select count(*)::int from public.profiles), 1, 'dueña Beta: ve solo su propio perfil');

reset role;

-- =============================================================================
-- Usuario sin comercio
-- =============================================================================
select pg_temp.login('44444444-4444-4444-8444-444444444444');
set local role authenticated;

select is_empty(format('select * from public.%I', t), format('sin comercio: %s vacío', t))
from unnest(array[
  'tenants', 'tenant_members', 'domains', 'tenant_settings', 'business_hours',
  'subscriptions', 'billing_payments', 'tenant_modules', 'tenant_invitations', 'audit_log'
]) as t;

reset role;

-- =============================================================================
-- Superadmin con su sesión normal: NO tiene acceso por RLS.
-- El panel central opera desde el servidor con la clave secreta (etapa 9).
-- =============================================================================
select pg_temp.login('55555555-5555-4555-8555-555555555555');
set local role authenticated;

select is_empty('select * from public.tenants', 'superadmin: su sesión no ve comercios por RLS');
select is((select count(*)::int from public.platform_admins), 1, 'superadmin: ve solo su fila de platform_admins');

reset role;

-- =============================================================================
-- Integridad: lo que la base rechaza aunque el código y RLS fallaran
-- (como postgres, sin RLS)
-- =============================================================================
select pg_temp.logout();

select throws_ok(
  $$ update public.domains set tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501', null, 'integridad: tenant_id es inmutable aun sin RLS'
);
select throws_ok(
  $$ insert into public.billing_payments (tenant_id, subscription_id, amount, paid_at, method)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'b5b5b5b5-0000-4000-8000-00000000000b', 100, now(), 'cash') $$,
  '23503', null, 'integridad: un pago de Alfa no puede apuntar a la suscripción de Beta (FK compuesta)'
);
select throws_ok(
  $$ insert into public.subscriptions (tenant_id, plan_id, status, current_period_end)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'base', 'active', now() + interval '1 month') $$,
  '23505', null, 'integridad: una sola suscripción vigente por comercio'
);
select throws_ok(
  $$ insert into public.tenant_members (tenant_id, user_id, role)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '44444444-4444-4444-8444-444444444444', 'owner') $$,
  '23505', null, 'integridad: un solo dueño por comercio'
);
select throws_ok(
  $$ insert into public.tenant_invitations (tenant_id, email, role, token_hash)
     values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'staff@example.com', 'staff', repeat('9', 64)) $$,
  'P0001', null, 'integridad: el plan Base no admite un segundo usuario'
);
select throws_ok(
  $$ update public.tenant_settings set logo_path = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/branding/logo.webp'
     where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '23514', null, 'integridad: el logo debe estar en la carpeta del propio comercio'
);

select throws_ok(
  format($$ insert into public.tenants (slug, name, business_type) values (%L, 'Prueba', 'general') $$, s),
  '23514', null, format('integridad: slug inválido o reservado rechazado: %s', s)
)
from unnest(array['admin', 'www', 'xn--abc', 'AB', 'ab', '-alfa', 'alfa-']) as s;

select throws_ok(
  $$ update public.audit_log set reason = 'borrado' $$,
  '42501', null, 'integridad: audit_log no admite UPDATE'
);
select throws_ok(
  $$ delete from public.audit_log $$,
  '42501', null, 'integridad: audit_log no admite DELETE'
);
select throws_ok(
  $$ update public.events set type = 'tenant.hacked' $$,
  '42501', null, 'integridad: events no admite UPDATE'
);

select * from finish();
rollback;
