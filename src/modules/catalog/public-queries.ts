import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import type { ProductSpec } from "@/lib/catalog-options";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * Lecturas del catálogo PÚBLICO (diseño, sección 12).
 *
 * - Cacheada con el tenantId como único argumento y el tag `tenant:{id}:catalog`.
 * - El tenantId sale de getStorefront(host), nunca del navegador.
 * - Cliente público sin cookies: RLS actúa como anon (solo comercios públicos, solo lo
 *   visible y publicado). Además se filtra acá por tenant_id, visibilidad y publicación
 *   (dos barreras).
 * - Las Server Actions del panel invalidan el tag después de cada cambio (cache.ts).
 */

export type PublicCategory = { id: string; name: string; slug: string; description: string | null };

export type PublicProduct = {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  isAvailable: boolean;
  isFeatured: boolean;
  /** Fotos en orden; cada ruta es la base `{tenant}/products/{product}/{image}`. */
  images: { path: string; alt: string | null }[];
  tags: string[];
  specs: ProductSpec[];
};

export type PublicCatalog = {
  categories: PublicCategory[];
  products: PublicProduct[];
};

export async function getPublicCatalog(tenantId: string): Promise<PublicCatalog> {
  "use cache";
  cacheTag(cacheTags.tenantCatalog(tenantId));
  cacheLife("hours");

  const supabase = createSupabasePublicClient();

  const [categories, products] = await Promise.all([
    supabase
      .from("catalog_categories")
      .select("id, name, slug, description")
      .eq("tenant_id", tenantId)
      .eq("is_visible", true)
      .order("position")
      .order("name"),
    supabase
      .from("catalog_products")
      .select("id, category_id, name, description, price, compare_at_price, is_available, is_featured, tags, specs")
      .eq("tenant_id", tenantId)
      .eq("is_published", true)
      .order("position")
      .order("name")
      .limit(1000),
  ]);
  if (categories.error) throw new Error(`No se pudieron leer las categorías: ${categories.error.message}`);
  if (products.error) throw new Error(`No se pudieron leer los productos: ${products.error.message}`);

  // Un producto de una categoría oculta no se muestra: ocultar la categoría oculta su sección.
  const visible = new Set(categories.data.map((c) => c.id));
  const shown = products.data.filter((p) => p.category_id === null || visible.has(p.category_id));

  const imagesByProduct = new Map<string, { path: string; alt: string | null }[]>();
  if (shown.length > 0) {
    const { data: images, error } = await supabase
      .from("catalog_product_images")
      .select("product_id, storage_path, alt")
      .eq("tenant_id", tenantId)
      .in("product_id", shown.map((p) => p.id))
      .order("position")
      .order("created_at");
    if (error) throw new Error(`No se pudieron leer las fotos: ${error.message}`);
    for (const image of images) {
      const list = imagesByProduct.get(image.product_id) ?? [];
      list.push({ path: image.storage_path, alt: image.alt });
      imagesByProduct.set(image.product_id, list);
    }
  }

  return {
    categories: categories.data,
    products: shown.map((p) => ({
      id: p.id,
      categoryId: p.category_id,
      name: p.name,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compare_at_price,
      isAvailable: p.is_available,
      isFeatured: p.is_featured,
      images: imagesByProduct.get(p.id) ?? [],
      tags: p.tags,
      specs: parseSpecs(p.specs),
    })),
  };
}

/** Las características ya vienen validadas por la base; esto solo descarta algo inesperado. */
function parseSpecs(raw: unknown): ProductSpec[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is ProductSpec => typeof r === "object" && r !== null && typeof r.label === "string" && typeof r.value === "string",
  );
}
