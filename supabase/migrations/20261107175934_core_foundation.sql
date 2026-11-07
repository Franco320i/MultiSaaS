-- =============================================================================
-- Núcleo · Base
-- Esquema `private` (no expuesto por la API de Supabase) y triggers genéricos
-- que usan todas las tablas. Diseño, secciones 3 y 5.
-- =============================================================================

create schema if not exists private;

-- Las políticas RLS se evalúan con los privilegios de quien consulta: anon y
-- authenticated necesitan USAGE para poder llamar a las funciones auxiliares.
-- El esquema no está en la lista de esquemas expuestos de PostgREST, así que
-- esas funciones no se pueden invocar desde la API.
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- tenant_id inmutable: ninguna fila puede cambiarse de comercio con un UPDATE.
-- -----------------------------------------------------------------------------
create function private.prevent_tenant_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'tenant_id no se puede modificar (%).', tg_table_name
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tablas de solo inserción (audit_log, events).
-- -----------------------------------------------------------------------------
create function private.prevent_modification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% es de solo inserción: no admite %.', tg_table_name, tg_op
    using errcode = '42501';
end;
$$;

-- Las funciones de trigger no las llama nadie directamente.
revoke execute on function private.set_updated_at() from public, anon, authenticated;
revoke execute on function private.prevent_tenant_change() from public, anon, authenticated;
revoke execute on function private.prevent_modification() from public, anon, authenticated;
