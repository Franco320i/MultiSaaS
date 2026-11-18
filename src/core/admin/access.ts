import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { loginPath } from "@/core/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Acceso al panel central (diseño, secciones 6 y 9). Va DENTRO de cada página y
 * Server Action de /admin, no solo en el layout (las acciones son endpoints públicos).
 *
 * - Sin sesión → login del host admin.
 * - Con sesión pero sin fila en platform_admins → 404 (no confirma que exista).
 * - Admin sin MFA verificado en esta sesión (aal1) → /mfa (activar o pedir el código).
 * - superadmin: todo. support: solo lectura (las acciones que cambian datos piden superadmin).
 *
 * La fila de platform_admins se lee con la sesión del usuario (RLS: cada uno ve solo
 * la suya). El nivel aal sale del token verificado con getClaims().
 */

export type PlatformRole = "superadmin" | "support";
export type AdminAccess = { userId: string; email: string | null; role: PlatformRole };

export type AdminGate =
  | { status: "anonymous" }
  | { status: "forbidden" }
  | { status: "needs-mfa"; userId: string; email: string | null; role: PlatformRole }
  | { status: "ok"; access: AdminAccess };

export const resolvePlatformAdmin = cache(async (): Promise<AdminGate> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { status: "anonymous" };

  const { data: row } = await supabase.from("platform_admins").select("role").eq("user_id", claims.sub).maybeSingle();
  if (!row || (row.role !== "superadmin" && row.role !== "support")) return { status: "forbidden" };

  const email = typeof claims.email === "string" ? claims.email : null;
  const role = row.role as PlatformRole;
  if (claims.aal !== "aal2") return { status: "needs-mfa", userId: claims.sub, email, role };
  return { status: "ok", access: { userId: claims.sub, email, role } };
});

export async function requirePlatformAdmin(returnTo = "/", minimumRole: PlatformRole = "support"): Promise<AdminAccess> {
  const gate = await resolvePlatformAdmin();
  if (gate.status === "anonymous") redirect(loginPath(returnTo));
  if (gate.status === "forbidden") notFound();
  if (gate.status === "needs-mfa") redirect("/mfa");
  if (minimumRole === "superadmin" && gate.access.role !== "superadmin") notFound();
  return gate.access;
}
