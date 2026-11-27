-- =============================================================================
-- Panel central: "Nueva contraseña" para el dueño de un comercio (rediseño 11e,
-- docs/superpowers/specs/2026-11-26-pedi-tu-demo-design.md).
--
-- Sin correos: la plataforma le genera una contraseña al dueño y se la manda por
-- WhatsApp. Esta función verifica al superadmin, exige motivo, busca al dueño y deja la
-- acción en la auditoría del comercio (el dueño la ve en "Accesos de la plataforma").
-- Se registra ANTES de cambiar la contraseña, como la entrada del modo soporte: no puede
-- haber un cambio sin su registro. La contraseña la cambia el servidor con la API de
-- administración de Auth y NUNCA pasa por acá.
-- No sirve para cuentas de administradores (aunque sean dueñas de algún comercio): esas
-- se manejan desde el panel de Supabase, con su MFA.
-- Igual que las demás admin_*: privada, invocadora y llamada solo por service_role.
-- =============================================================================

create function private.admin_log_owner_password_reset(p_actor uuid, p_tenant_id uuid, p_reason text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_reason text;
  v_status text;
  v_owner  uuid;
begin
  perform private.assert_superadmin(p_actor);
  v_reason := private.require_reason(p_reason);

  select t.status into v_status from public.tenants t where t.id = p_tenant_id;
  if v_status is null then
    raise exception 'tenant_not_found' using errcode = 'P0001';
  end if;
  if v_status = 'cancelled' then
    raise exception 'tenant_cancelled' using errcode = 'P0001';
  end if;

  select m.user_id into v_owner
  from public.tenant_members m
  where m.tenant_id = p_tenant_id and m.role = 'owner';
  if v_owner is null then
    raise exception 'owner_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.platform_admins a where a.user_id = v_owner) then
    raise exception 'owner_is_admin' using errcode = 'P0001';
  end if;

  insert into public.audit_log (tenant_id, actor_user_id, actor_kind, action, target_type, target_id, reason)
  values (p_tenant_id, p_actor, 'platform_admin', 'owner.password_reset', 'user', v_owner::text, v_reason);

  return v_owner;
end;
$$;

revoke execute on function private.admin_log_owner_password_reset(uuid, uuid, text) from public, anon, authenticated;
grant execute on function private.admin_log_owner_password_reset(uuid, uuid, text) to service_role;

create function public.admin_log_owner_password_reset(p_actor uuid, p_tenant_id uuid, p_reason text)
returns uuid language sql volatile set search_path = ''
as $$ select private.admin_log_owner_password_reset(p_actor, p_tenant_id, p_reason); $$;

revoke execute on function public.admin_log_owner_password_reset(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_log_owner_password_reset(uuid, uuid, text) to service_role;

comment on function public.admin_log_owner_password_reset(uuid, uuid, text) is
  'Solo service_role (panel central, Nueva contraseña). Delegada en private.admin_log_owner_password_reset. Devuelve el dueño.';
