"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/core/auth/session";
import { provisionTenant, setTenantPublished } from "@/core/tenancy/provision";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { isValidSlug } from "@/core/tenancy/slug";
import { env } from "@/lib/env";
import { ImageError, MAX_UPLOAD_BYTES, processProductImage } from "@/lib/images/process";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidateStorefrontHosts, revalidateStorefrontSettings } from "./cache";
import * as mutations from "./mutations";
import { listTenantHosts } from "./queries";
import {
  brandSchema,
  contactSchema,
  deliverySchema,
  hoursFromForm,
  hoursSchema,
  provisionSchema,
  WIZARD_STEPS,
} from "./schemas";

/**
 * Server Actions del alta y de la configuración del comercio. Endpoints públicos:
 * - alta: requireUser (el usuario sale de la sesión verificada, nunca del formulario);
 * - configuración: requireTenantAccess(slug, "settings.write"), solo el dueño;
 * - publicar: requireTenantAccess(slug, "catalog.publish").
 * Después de escribir se invalida la caché del catálogo con el tenantId verificado.
 */

export type SettingsFormState = { error?: string; saved?: boolean; fields?: Record<string, string> };

function fieldsOf(formData: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) fields[key] = value.slice(0, 600);
  }
  // Casillas con el mismo nombre: se guardan todas, separadas por coma.
  const payments = formData.getAll("payment_methods").filter((v) => typeof v === "string");
  if (payments.length > 0) fields.payment_methods = payments.join(",");
  return fields;
}

function done(slug: string, formData: FormData): SettingsFormState {
  const next = formData.get("next");
  if (typeof next === "string" && (WIZARD_STEPS as readonly string[]).includes(next)) {
    redirect(`/${slug}/configurar?paso=${next}`);
  }
  refresh();
  return { saved: true };
}

// -----------------------------------------------------------------------------
// Alta (paso 1)
// -----------------------------------------------------------------------------

const PROVISION_MESSAGES: Record<string, string> = {
  user_not_confirmed: "Confirmá tu email antes de crear el comercio.",
  invalid_name: "Escribí el nombre del comercio.",
  invalid_slug: "Esa dirección no se puede usar. Probá con otra.",
  slug_taken: "Esa dirección ya la usa otro comercio. Probá con otra.",
  invalid_business_type: "Elegí un rubro.",
  invalid_whatsapp: "Escribí el WhatsApp con código de país, por ejemplo +54 9 2954 123456.",
};

export async function provisionTenantAction(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const user = await requireUser("/nuevo");
  const parsed = provisionSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    businessType: formData.get("businessType"),
    whatsappPhone: formData.get("whatsappPhone"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields: fieldsOf(formData) };

  const result = await provisionTenant(user.id, parsed.data, env.ROOT_DOMAIN);
  if (!result.ok) {
    return {
      error: PROVISION_MESSAGES[result.error] ?? "No pudimos crear el comercio. Probá de nuevo en unos minutos.",
      fields: fieldsOf(formData),
    };
  }
  redirect(`/${result.slug}/configurar`);
}

export async function checkSlugAction(slug: string): Promise<{ available: boolean; reason?: "invalid" | "taken" }> {
  await requireUser("/nuevo");
  const candidate = typeof slug === "string" ? slug.trim().toLowerCase() : "";
  if (!isValidSlug(candidate)) return { available: false, reason: "invalid" };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("slug_available", { p_slug: candidate });
  return data === true ? { available: true } : { available: false, reason: "taken" };
}

// -----------------------------------------------------------------------------
// Configuración (asistente y Ajustes)
// -----------------------------------------------------------------------------

async function ownerContext(slug: string) {
  const access = await requireTenantAccess(slug, "settings.write");
  const supabase = await createSupabaseServerClient();
  return { access, supabase };
}

export async function saveBrandAction(slug: string, _prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const { access, supabase } = await ownerContext(slug);
  const parsed = brandSchema.safeParse({
    display_name: formData.get("display_name"),
    tagline: formData.get("tagline") ?? undefined,
    description: formData.get("description") ?? undefined,
    brand: formData.get("brand"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields: fieldsOf(formData) };

  const { brand, ...texts } = parsed.data;
  const saved = await mutations.updateSettings(supabase, access.tenantId, texts);
  const colored = saved.ok ? await mutations.setBrandColor(supabase, access.tenantId, brand) : saved;
  if (!colored.ok) return { error: colored.error, fields: fieldsOf(formData) };
  revalidateStorefrontSettings(access.tenantId);
  return done(access.slug, formData);
}

export async function saveContactAction(slug: string, _prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const { access, supabase } = await ownerContext(slug);
  const contact = contactSchema.safeParse({
    whatsapp_phone: formData.get("whatsapp_phone"),
    instagram: formData.get("instagram") ?? "",
    address: formData.get("address") ?? undefined,
    city: formData.get("city") ?? undefined,
    payment_methods: formData.getAll("payment_methods"),
    highlights: [0, 1, 2, 3].map((i) => formData.get(`highlight_${i}`) ?? ""),
  });
  if (!contact.success) return { error: contact.error.issues[0]?.message, fields: fieldsOf(formData) };
  const delivery = deliverySchema.safeParse({
    accepts_pickup: formData.get("accepts_pickup") === "on",
    accepts_delivery: formData.get("accepts_delivery") === "on",
    delivery_fee: formData.get("delivery_fee") ?? "",
    min_order_amount: formData.get("min_order_amount") ?? "",
  });
  if (!delivery.success) return { error: delivery.error.issues[0]?.message, fields: fieldsOf(formData) };

  const result = await mutations.updateSettings(supabase, access.tenantId, {
    ...contact.data,
    ...delivery.data,
    delivery_fee: delivery.data.accepts_delivery ? delivery.data.delivery_fee : 0,
  });
  if (!result.ok) return { error: result.error, fields: fieldsOf(formData) };
  revalidateStorefrontSettings(access.tenantId);
  return done(access.slug, formData);
}

export async function saveHoursAction(slug: string, _prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const { access, supabase } = await ownerContext(slug);
  const parsed = hoursSchema.safeParse(hoursFromForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los horarios.", fields: fieldsOf(formData) };

  const result = await mutations.replaceHours(supabase, access.tenantId, parsed.data);
  if (!result.ok) return { error: result.error, fields: fieldsOf(formData) };
  revalidateStorefrontSettings(access.tenantId);
  return done(access.slug, formData);
}

export async function uploadBrandingAction(
  slug: string,
  kind: string,
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { access, supabase } = await ownerContext(slug);
  if (kind !== "logo" && kind !== "cover") return { error: "Imagen inválida." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elegí una imagen." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "La imagen pesa demasiado (máximo 4 MB)." };

  try {
    const processed = await processProductImage(Buffer.from(await file.arrayBuffer()));
    const result = await mutations.setBrandingImage(supabase, access.tenantId, kind, processed);
    if (!result.ok) return { error: result.error };
  } catch (error) {
    return { error: error instanceof ImageError ? error.message : "No pudimos procesar la imagen. Probá con otra." };
  }
  revalidateStorefrontSettings(access.tenantId);
  refresh();
  return { saved: true };
}

export async function removeBrandingAction(slug: string, kind: string): Promise<SettingsFormState> {
  const { access, supabase } = await ownerContext(slug);
  if (kind !== "logo" && kind !== "cover") return { error: "Imagen inválida." };
  const result = await mutations.removeBrandingImage(supabase, access.tenantId, kind);
  if (!result.ok) return { error: result.error };
  revalidateStorefrontSettings(access.tenantId);
  refresh();
  return { saved: true };
}

// -----------------------------------------------------------------------------
// Publicar
// -----------------------------------------------------------------------------

const PUBLISH_MESSAGES: Record<string, string> = {
  missing_whatsapp: "Cargá el WhatsApp del comercio antes de publicar.",
  no_products: "Publicá al menos un producto antes de publicar el catálogo.",
  tenant_not_active: "El comercio está suspendido. Escribinos para reactivarlo.",
};

export async function setPublishedAction(slug: string, published: boolean): Promise<SettingsFormState> {
  const access = await requireTenantAccess(slug, "catalog.publish");
  const user = await requireUser(`/${slug}`);
  if (typeof published !== "boolean") return { error: "Acción inválida." };

  const result = await setTenantPublished(access.tenantId, user.id, published);
  if (!result.ok) return { error: PUBLISH_MESSAGES[result.error] ?? "No pudimos cambiar la publicación. Probá de nuevo." };

  const supabase = await createSupabaseServerClient();
  revalidateStorefrontHosts(access.tenantId, await listTenantHosts(supabase, access.tenantId));
  refresh();
  return { saved: true };
}
