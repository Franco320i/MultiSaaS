import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { PublicPlan } from "./plan-display";

export type { PublicPlan } from "./plan-display";

const rowsSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    price_ars: z.number().int().nonnegative(),
    max_products: z.number().int().positive().nullable(),
    max_images_per_product: z.number().int().positive(),
    sort: z.number().int(),
  }),
);

/**
 * Planes públicos para la página principal. Son datos de la plataforma (no de un
 * comercio): cliente público sin cookies, sin headers() ni sesión, tag global `plans`.
 *
 * Si la base no responde, devuelve [] (la página muestra un texto en lugar de los
 * precios) y lo cachea pocos minutos para reintentar pronto, sin romper el build.
 */
export async function getPublicPlans(): Promise<PublicPlan[]> {
  "use cache";
  cacheTag(cacheTags.plans());

  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("plans")
      .select("id, name, price_ars, max_products, max_images_per_product, sort")
      .eq("is_public", true)
      .order("sort");
    if (error) throw error;

    const rows = rowsSchema.parse(data);
    cacheLife("hours");
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      priceCents: row.price_ars,
      maxProducts: row.max_products,
      maxImagesPerProduct: row.max_images_per_product,
      sort: row.sort,
    }));
  } catch {
    console.error("No se pudieron leer los planes públicos.");
    cacheLife("minutes");
    return [];
  }
}
