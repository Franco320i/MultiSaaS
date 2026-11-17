-- =============================================================================
-- Capa 2 · Límites de frecuencia: public.rate_limit_hit (solo service_role)
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Nadie fuera del servidor la puede usar (ni para gastar el cupo de otro).
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok($$ select public.rate_limit_hit('x', 60, 5) $$, '42501', null, 'anon: no puede usar rate_limit_hit');
select throws_ok($$ select * from public.rate_limits $$, '42501', null, 'anon: no lee rate_limits');

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', '11111111-1111-4111-8111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok($$ select public.rate_limit_hit('x', 60, 5) $$, '42501', null, 'authenticated: no puede usar rate_limit_hit');

reset role;
set local role service_role;
select ok(public.rate_limit_hit('prueba:a', 600, 3), 'service_role: 1.º intento dentro del límite');
select ok(public.rate_limit_hit('prueba:a', 600, 3), 'service_role: 2.º intento dentro del límite');
select ok(public.rate_limit_hit('prueba:a', 600, 3), 'service_role: 3.º intento dentro del límite');
select ok(not public.rate_limit_hit('prueba:a', 600, 3), 'service_role: el 4.º intento supera el límite');
select ok(public.rate_limit_hit('prueba:b', 600, 3), 'service_role: otra clave tiene su propio cupo');
select throws_ok($$ select public.rate_limit_hit(repeat('k', 201), 60, 5) $$, 'P0001', 'invalid_rate_limit', 'clave demasiado larga');
select throws_ok($$ select public.rate_limit_hit('k', 0, 5) $$, 'P0001', 'invalid_rate_limit', 'ventana inválida');

select * from finish();
rollback;
