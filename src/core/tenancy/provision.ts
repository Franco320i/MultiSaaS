import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Alta y publicación de comercios (diseño, sección 10). Lista cerrada de la clave
 * secreta: este archivo figura en SERVICE_KEY_ALLOWED (eslint.config.mjs).
 *
 * - El usuario sale SIEMPRE de la sesión verificada (requireUser), nunca del formulario.
 * - Publicar exige antes requireTenantAccess(slug, "catalog.publish") en quien llama.
 * Sin Next.js, para poder probarlo contra la base local.
 */

export type ProvisionInput = {
  name: string;
  slug: string;
  businessType: string;
  whatsappPhone: string;
};

export type ProvisionError =
  | "user_not_confirmed"
  | "invalid_name"
  | "invalid_slug"
  | "slug_taken"
  | "invalid_business_type"
  | "invalid_whatsapp"
  | "unknown";

export type ProvisionResult =
  | { ok: true; tenantId: string; slug: string; created: boolean }
  | { ok: false; error: ProvisionError };

const PROVISION_ERRORS = new Set<string>([
  "user_not_confirmed",
  "invalid_name",
  "invalid_slug",
  "slug_taken",
  "invalid_business_type",
  "invalid_whatsapp",
]);

export async function provisionTenant(
  userId: string,
  input: ProvisionInput,
  rootDomain: string,
): Promise<ProvisionResult> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("provision_tenant", {
    p_user_id: userId,
    p_input: {
      name: input.name,
      slug: input.slug,
      business_type: input.businessType,
      whatsapp_phone: input.whatsappPhone,
    },
    p_root_domain: rootDomain,
  });

  if (error) {
    if (error.code === "P0001" && PROVISION_ERRORS.has(error.message)) {
      return { ok: false, error: error.message as ProvisionError };
    }
    console.error("provision_tenant falló", { code: error.code, message: error.message });
    return { ok: false, error: "unknown" };
  }

  const result = data as { tenant_id?: unknown; slug?: unknown; created?: unknown } | null;
  if (typeof result?.tenant_id !== "string" || typeof result.slug !== "string") {
    return { ok: false, error: "unknown" };
  }
  return { ok: true, tenantId: result.tenant_id, slug: result.slug, created: result.created === true };
}

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
