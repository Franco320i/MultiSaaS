-- =============================================================================
-- Límites de frecuencia (diseño, sección 11, "Límites contra abuso").
-- Usa la tabla rate_limits (UNLOGGED, etapa 2). Ventanas fijas: cada llamada suma
-- un intento a la ventana actual de la clave y dice si todavía está dentro del límite.
-- Las claves las arma el servidor y nunca llevan la IP en claro (va un hash con sal).
-- La limpieza de ventanas viejas la hace el cron diario (etapa 9).
-- =============================================================================

create function private.rate_limit_hit(p_key text, p_window_seconds integer, p_limit integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits   integer;
begin
  if p_key is null or char_length(p_key) > 200 or p_window_seconds not between 1 and 86400 or p_limit < 1 then
    raise exception 'invalid_rate_limit' using errcode = 'P0001';
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke execute on function private.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function private.rate_limit_hit(text, integer, integer) to service_role;

-- Puerta para el servidor (mismo criterio que public.create_order): SECURITY INVOKER
-- y ejecutable solo por service_role.
create function public.rate_limit_hit(p_key text, p_window_seconds integer, p_limit integer)
returns boolean
language sql
volatile
set search_path = ''
as $$
  select private.rate_limit_hit(p_key, p_window_seconds, p_limit);
$$;

comment on function public.rate_limit_hit(text, integer, integer) is
  'Solo service_role. true = dentro del límite. Delegada en private.rate_limit_hit.';

revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
