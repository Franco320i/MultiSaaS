import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { brandShades, parseHexColor, readableTextOn } from "@/lib/color";
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

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const BRANDING_PATH = new RegExp(`^${UUID}/branding/(logo|cover)-${UUID}$`);
const brandingPath = z
  .string()
  .nullable()
  .transform((path) => (path && BRANDING_PATH.test(path) ? path : null));

const availableSchema = z.object({
  available: z.literal(true),
  tenant_id: z.uuid(),
  slug: z.string(),
  display_name: z.string(),
  tagline: z.string().nullable(),
  description: z.string().nullable(),
  // Solo el formato que genera el servidor ({tenant}/branding/{tipo}-{uuid}): la ruta
  // termina en un url("…") de CSS y el dueño puede escribir la columna con su sesión.
  logo_path: brandingPath,
  cover_path: brandingPath,
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
  // Catálogo nuevo (parte 2). Por defecto vacíos: un despliegue que llega antes que la migración no se rompe.
  payment_methods: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  hours: hoursSchema,
});

const resultSchema = z.union([z.null(), z.object({ available: z.literal(false) }), availableSchema]);

export type Storefront = Omit<z.infer<typeof availableSchema>, "theme"> & {
  brand: string;
  brandForeground: string;
  /** Derivados de `brand` (brandShades): segundo color, tinte y fondo teñido. */
  brand2: string;
  brandTint: string;
  brandPage: string;
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
  const shades = brandShades(brand);
  return {
    ...rest,
    brand,
    brandForeground: readableTextOn(brand),
    brand2: shades.brand2,
    brandTint: shades.tint,
    brandPage: shades.page,
  };
}
