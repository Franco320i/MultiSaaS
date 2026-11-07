import type { SupabaseClient } from "@supabase/supabase-js";
import { can, isTenantRole, type Permission, type TenantRole } from "@/core/auth/permissions";
import type { Database } from "@/types/database";
import { isValidSlug } from "./slug";

/**
 * Resolución de acceso a un comercio (diseño, sección 6). Sin dependencias de
 * Next.js para poder probarla contra la base local con usuarios reales.
 *
 * Regla: el comercio sale del slug de la ruta y se verifica contra tenant_members
 * con la sesión del usuario (RLS activo). Nunca se acepta un tenant_id del navegador.
 */

export type TenantStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled";

export type TenantAccess = {
  tenantId: string;
  slug: string;
  name: string;
  status: TenantStatus;
  role: TenantRole;
};

export type AccessResult =
  | { ok: true; access: TenantAccess }
  /** No es miembro, el slug no existe o el comercio está cancelado. Se responde 404. */
  | { ok: false; reason: "not-found" }
  /** Es miembro, pero su rol no tiene el permiso pedido. */
  | { ok: false; reason: "forbidden"; access: TenantAccess };

export async function resolveTenantAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  slug: string,
  permission: Permission,
): Promise<AccessResult> {
  if (!isValidSlug(slug)) return { ok: false, reason: "not-found" };

  const { data, error } = await supabase
    .from("tenant_members")
    .select("role, tenants!inner (id, slug, name, status)")
    .eq("user_id", userId)
    .eq("tenants.slug", slug)
    .maybeSingle();

  if (error) throw new Error(`No se pudo verificar el acceso al comercio: ${error.message}`);
  if (!data || !isTenantRole(data.role)) return { ok: false, reason: "not-found" };

  const tenant = data.tenants;
  if (tenant.status === "cancelled") return { ok: false, reason: "not-found" };

  const access: TenantAccess = {
    tenantId: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status as TenantStatus,
    role: data.role,
  };

  return can(access.role, permission) ? { ok: true, access } : { ok: false, reason: "forbidden", access };
}

/** Comercios del usuario, para la pantalla de selección del panel. */
export async function listMyTenants(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("tenant_members")
    .select("role, tenants!inner (slug, name, status)")
    .eq("user_id", userId)
    .neq("tenants.status", "cancelled")
    .order("created_at");

  if (error) throw new Error(`No se pudieron listar los comercios: ${error.message}`);
  return data.map((row) => ({ role: row.role, ...row.tenants }));
}
