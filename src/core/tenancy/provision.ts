import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Publicación de comercios (diseño, sección 10). El alta la hace solo el panel central
 * (alta asistida, src/core/admin/service.ts). Lista cerrada de la clave secreta: este
 * archivo figura en SERVICE_KEY_ALLOWED (eslint.config.mjs).
 *
 * - El usuario sale SIEMPRE de la sesión verificada, nunca del formulario.
 * - Publicar exige antes requireTenantAccess(slug, "catalog.publish") en quien llama.
 * Sin Next.js, para poder probarlo contra la base local.
 */

export type PublishError = "missing_whatsapp" | "no_products" | "tenant_not_active" | "unknown";
export type PublishResult = { ok: true; publishedAt: string | null } | { ok: false; error: PublishError };

export async function setTenantPublished(
  tenantId: string,
  actorId: string,
  published: boolean,
): Promise<PublishResult> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("set_tenant_published", {
    p_tenant_id: tenantId,
    p_actor_id: actorId,
    p_published: published,
  });
  if (error) {
    if (error.code === "P0001" && ["missing_whatsapp", "no_products", "tenant_not_active"].includes(error.message)) {
      return { ok: false, error: error.message as PublishError };
    }
    console.error("set_tenant_published falló", { code: error.code, message: error.message });
    return { ok: false, error: "unknown" };
  }
  return { ok: true, publishedAt: (data as string | null) ?? null };
}
