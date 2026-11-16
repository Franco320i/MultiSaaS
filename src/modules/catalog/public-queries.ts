import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
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
  /** Ruta base de la primera foto (`{tenant}/products/{product}/{image}`), o null. */
  imagePath: string | null;
  imageAlt: string | null;
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
      .select("id, category_id, name, description, price, compare_at_price, is_available, is_featured")
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

  const firstImage = new Map<string, { storage_path: string; alt: string | null }>();
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
      if (!firstImage.has(image.product_id)) firstImage.set(image.product_id, image);
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
      imagePath: firstImage.get(p.id)?.storage_path ?? null,
      imageAlt: firstImage.get(p.id)?.alt ?? null,
    })),
  };
}
