-- =============================================================================
-- Sin registro automático (rediseño 11e, docs/superpowers/specs/2026-11-26-pedi-tu-demo-design.md).
--
-- El alta por autoservicio se quitó de la app (/registro y /nuevo): los comercios los
-- crea solo el panel central con private.admin_provision_tenant, que comparte
-- private.create_tenant. Se borra la función del autoservicio para que no quede un
-- camino de alta sin uso (ya solo la podía ejecutar service_role).
-- =============================================================================

drop function public.provision_tenant(uuid, jsonb, text);
drop function private.provision_tenant(uuid, jsonb, text);
