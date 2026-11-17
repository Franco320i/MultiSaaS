import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IMAGE_SIZES, type ProcessedImage } from "@/lib/images/process";
import { imageObjectName } from "@/lib/images/url";
import type { Database } from "@/types/database";
import type { HoursInput } from "./schemas";

/**
 * Escrituras de la configuración del comercio con la SESIÓN del usuario: RLS solo deja
 * al dueño editar tenant_settings y business_hours de su comercio. Sin Next.js.
 */

type Client = SupabaseClient<Database>;
export type SettingsResult = { ok: true } | { ok: false; error: string };

const BUCKET = "catalog-public";
const ONE_YEAR_SECONDS = "31536000";

type SettingsPatch = Database["public"]["Tables"]["tenant_settings"]["Update"];

export async function updateSettings(supabase: Client, tenantId: string, patch: SettingsPatch): Promise<SettingsResult> {
  const { data, error } = await supabase
    .from("tenant_settings")
    .update(patch)
    .eq("tenant_id", tenantId)
    .select("tenant_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "No pudimos guardar los cambios. Probá de nuevo." };
  return { ok: true };
}

/** Color de marca dentro de theme, sin pisar otras claves que tenga. */
export async function setBrandColor(supabase: Client, tenantId: string, brand: string): Promise<SettingsResult> {
  const { data } = await supabase.from("tenant_settings").select("theme").eq("tenant_id", tenantId).single();
  const theme = { ...((data?.theme as Record<string, unknown>) ?? {}), brand };
  return updateSettings(supabase, tenantId, { theme });
}

/**
 * Reemplaza los horarios: primero inserta los nuevos y después borra los viejos, así
 * un error a mitad de camino nunca deja al comercio sin horarios.
 */
export async function replaceHours(supabase: Client, tenantId: string, ranges: HoursInput): Promise<SettingsResult> {
  const { data: old, error: readError } = await supabase.from("business_hours").select("id").eq("tenant_id", tenantId);
  if (readError) return { ok: false, error: "No pudimos guardar los horarios. Probá de nuevo." };

  if (ranges.length > 0) {
    const { error } = await supabase
      .from("business_hours")
      .insert(ranges.map((r) => ({ tenant_id: tenantId, weekday: r.weekday, opens_at: r.opens_at, closes_at: r.closes_at })));
    if (error) return { ok: false, error: "No pudimos guardar los horarios. Revisá las horas y probá de nuevo." };
  }
  const oldIds = (old ?? []).map((h) => h.id);
  if (oldIds.length > 0) {
    const { error } = await supabase.from("business_hours").delete().eq("tenant_id", tenantId).in("id", oldIds);
    if (error) return { ok: false, error: "No pudimos guardar los horarios. Probá de nuevo." };
  }
  return { ok: true };
}

/**
 * Logo o portada: sube los dos tamaños a {tenant}/branding/{tipo}-{uuid}, guarda la
 * ruta y borra los archivos del anterior. Cada subida tiene un nombre nuevo (caché de un año).
 */
export async function setBrandingImage(
  supabase: Client,
  tenantId: string,
  kind: "logo" | "cover",
  image: ProcessedImage,
): Promise<SettingsResult> {
  const column = kind === "logo" ? "logo_path" : "cover_path";
  const { data: current } = await supabase.from("tenant_settings").select(column).eq("tenant_id", tenantId).single();
  const previous = (current as Record<string, string | null> | null)?.[column] ?? null;

  const path = `${tenantId}/branding/${kind}-${crypto.randomUUID()}`;
  const uploaded: string[] = [];
  for (const size of IMAGE_SIZES) {
    const name = imageObjectName(path, size);
    const { error } = await supabase.storage.from(BUCKET).upload(name, image.files[size], {
      contentType: "image/webp",
      cacheControl: ONE_YEAR_SECONDS,
      upsert: false,
    });
    if (error) {
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
      return { ok: false, error: "No pudimos guardar la imagen. Probá de nuevo." };
    }
    uploaded.push(name);
  }

  const result = await updateSettings(supabase, tenantId, { [column]: path });
  if (!result.ok) {
    await supabase.storage.from(BUCKET).remove(uploaded);
    return result;
  }
  if (previous) await supabase.storage.from(BUCKET).remove(IMAGE_SIZES.map((s) => imageObjectName(previous, s)));
  return { ok: true };
}

export async function removeBrandingImage(supabase: Client, tenantId: string, kind: "logo" | "cover"): Promise<SettingsResult> {
  const column = kind === "logo" ? "logo_path" : "cover_path";
  const { data: current } = await supabase.from("tenant_settings").select(column).eq("tenant_id", tenantId).single();
  const previous = (current as Record<string, string | null> | null)?.[column] ?? null;
  const result = await updateSettings(supabase, tenantId, { [column]: null });
  if (result.ok && previous) {
    await supabase.storage.from(BUCKET).remove(IMAGE_SIZES.map((s) => imageObjectName(previous, s)));
  }
  return result;
}
