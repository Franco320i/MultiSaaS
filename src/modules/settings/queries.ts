import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Lecturas de la configuración del comercio para el panel, con la SESIÓN del usuario.
 * Siempre con el tenantId verificado por requireTenantAccess. Nada de esto se cachea.
 */

type Client = SupabaseClient<Database>;

export type TenantSettings = Pick<
  Database["public"]["Tables"]["tenant_settings"]["Row"],
  | "display_name"
  | "tagline"
  | "description"
  | "logo_path"
  | "cover_path"
  | "theme"
  | "template_key"
  | "whatsapp_phone"
  | "instagram"
  | "address"
  | "city"
  | "currency"
  | "accepts_pickup"
  | "accepts_delivery"
  | "delivery_fee"
  | "min_order_amount"
  | "payment_methods"
  | "highlights"
>;

export type BusinessTemplate = { key: string; name: string; brand: string | null };

export type SetupStatus = {
  hasLogo: boolean;
  hasHours: boolean;
  hasWhatsapp: boolean;
  publishedProducts: number;
  productsWithPhoto: number;
  publishedAt: string | null;
};

const SETTINGS_COLUMNS =
  "display_name, tagline, description, logo_path, cover_path, theme, template_key, whatsapp_phone, instagram, address, city, currency, accepts_pickup, accepts_delivery, delivery_fee, min_order_amount, payment_methods, highlights";

export async function getSettings(supabase: Client, tenantId: string): Promise<TenantSettings> {
  const { data, error } = await supabase.from("tenant_settings").select(SETTINGS_COLUMNS).eq("tenant_id", tenantId).single();
  if (error) throw new Error(`No se pudo leer la configuración: ${error.message}`);
  return data;
}

export async function getHours(supabase: Client, tenantId: string) {
  const { data, error } = await supabase
    .from("business_hours")
    .select("id, weekday, opens_at, closes_at")
    .eq("tenant_id", tenantId)
    .order("weekday")
    .order("opens_at");
  if (error) throw new Error(`No se pudieron leer los horarios: ${error.message}`);
  return data.map((h) => ({ ...h, opens_at: h.opens_at.slice(0, 5), closes_at: h.closes_at.slice(0, 5) }));
}

export async function listBusinessTemplates(supabase: Client): Promise<BusinessTemplate[]> {
  const { data, error } = await supabase
    .from("business_templates")
    .select("key, name, default_theme")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`No se pudieron leer los rubros: ${error.message}`);
  return data.map((t) => {
    const theme = t.default_theme as Record<string, unknown> | null;
    return { key: t.key, name: t.name, brand: typeof theme?.brand === "string" ? theme.brand : null };
  });
}

/** Qué le falta al comercio para estar completo (inicio del panel y pantalla de publicar). */
export async function getSetupStatus(supabase: Client, tenantId: string): Promise<SetupStatus> {
  const [settings, hours, products, photos, tenant] = await Promise.all([
    supabase.from("tenant_settings").select("logo_path, whatsapp_phone").eq("tenant_id", tenantId).single(),
    supabase.from("business_hours").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase
      .from("catalog_products")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_published", true),
    supabase.from("catalog_product_images").select("product_id").eq("tenant_id", tenantId).limit(1000),
    supabase.from("tenants").select("published_at").eq("id", tenantId).single(),
  ]);
  return {
    hasLogo: Boolean(settings.data?.logo_path),
    hasWhatsapp: Boolean(settings.data?.whatsapp_phone),
    hasHours: (hours.count ?? 0) > 0,
    publishedProducts: products.count ?? 0,
    productsWithPhoto: new Set((photos.data ?? []).map((p) => p.product_id)).size,
    publishedAt: tenant.data?.published_at ?? null,
  };
}

/** Hosts del comercio (para invalidar la caché del catálogo al publicar). */
export async function listTenantHosts(supabase: Client, tenantId: string): Promise<string[]> {
  const { data } = await supabase.from("domains").select("hostname").eq("tenant_id", tenantId).eq("status", "active");
  return (data ?? []).map((d) => d.hostname);
}

/** Dueño de algún comercio: el asistente de alta retoma ese comercio en vez de crear otro. */
export async function findOwnedTenantSlug(supabase: Client, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("tenant_members")
    .select("tenants(slug, status)")
    .eq("user_id", userId)
    .eq("role", "owner")
    .limit(5);
  const tenant = (data ?? [])
    .map((m) => m.tenants as unknown as { slug: string; status: string } | null)
    .find((t) => t && t.status !== "cancelled");
  return tenant?.slug ?? null;
}

/**
 * Entradas del panel central en modo soporte (diseño, sección 9: el dueño ve cuándo
 * entró soporte). RLS de audit_log: solo el dueño lee lo de su comercio.
 */
export async function listSupportAccesses(supabase: Client, tenantId: string, limit = 10): Promise<{ at: string; action: string }[]> {
  const { data } = await supabase
    .from("audit_log")
    .select("action, created_at")
    .eq("tenant_id", tenantId)
    .eq("actor_kind", "platform_admin")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({ at: r.created_at, action: r.action }));
}
