import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { parseHexColor, readableTextOn } from "@/lib/color";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { normalizeHost } from "./host";

/**
 * Catálogo público: host → comercio (diseño, secciones 7 y 12).
 *
 * Función cacheada con el host como ÚNICO argumento: no lee headers(), cookies() ni la
 * sesión, y usa el cliente público sin cookies. Por eso un resultado nunca se sirve a
 * otro host. Tags: `host:{host}` y, si el comercio existe, `tenant:{id}:settings`.
 */

const DEFAULT_BRAND = "#334155";

const hoursSchema = z.array(
  z.object({
    weekday: z.number().int().min(0).max(6),
    opens_at: z.string().regex(/^\d{2}:\d{2}$/),
    closes_at: z.string().regex(/^\d{2}:\d{2}$/),
  }),
);

const availableSchema = z.object({
  available: z.literal(true),
  tenant_id: z.uuid(),
  slug: z.string(),
  display_name: z.string(),
  tagline: z.string().nullable(),
  description: z.string().nullable(),
  logo_path: z.string().nullable(),
  cover_path: z.string().nullable(),
  theme: z.record(z.string(), z.unknown()),
  template_key: z.string(),
  whatsapp_phone: z.string().nullable(),
  instagram: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  currency: z.string(),
  timezone: z.string(),
  accepts_pickup: z.boolean(),
  accepts_delivery: z.boolean(),
  delivery_fee: z.number().int(),
  min_order_amount: z.number().int(),
  open_mode: z.enum(["auto", "open", "closed"]),
  closed_message: z.string().nullable(),
  hours: hoursSchema,
});

const resultSchema = z.union([z.null(), z.object({ available: z.literal(false) }), availableSchema]);

export type Storefront = Omit<z.infer<typeof availableSchema>, "theme"> & {
  brand: string;
  brandForeground: string;
};

export type StorefrontResult = null | { available: false } | Storefront;

export async function getStorefront(host: string): Promise<StorefrontResult> {
  "use cache";
  cacheTag(cacheTags.host(host));

  // Solo hosts ya normalizados. Lo demás no llega a la base.
  if (normalizeHost(host) !== host) {
    cacheLife("max");
    return null;
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("storefront_by_host", { p_host: host });
  if (error) throw new Error(`No se pudo resolver el catálogo: ${error.message}`);

  const parsed = resultSchema.parse(data);

  if (parsed === null) {
    // Host desconocido: 404 cacheado poco tiempo (diseño, sección 7), así un bot que
    // prueba subdominios no carga la base, y un comercio nuevo aparece enseguida.
    cacheLife({ stale: 60, revalidate: 60, expire: 60 });
    return null;
  }

  if (!parsed.available) {
    cacheLife("minutes");
    return { available: false };
  }

  cacheTag(cacheTags.tenantSettings(parsed.tenant_id));
  cacheLife("hours");

  const { theme, ...rest } = parsed;
  const brand = parseHexColor(theme.brand) ?? DEFAULT_BRAND;
  return { ...rest, brand, brandForeground: readableTextOn(brand) };
}
