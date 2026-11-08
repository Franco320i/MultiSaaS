import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IMAGE_SIZES, type ProcessedImage } from "@/lib/images/process";
import { imageObjectName } from "@/lib/images/url";
import type { Database } from "@/types/database";

/**
 * Fotos de productos: lecturas y escrituras. Sin dependencias de Next.js para poder
 * probarlas contra la base y el Storage locales con sesiones reales.
 *
 * Se usa el cliente con la SESIÓN del usuario (no la clave secreta): las políticas de
 * la tabla y las de Storage actúan también acá (defensa en profundidad). Las rutas las
 * arma el servidor con el tenantId verificado; nunca vienen del navegador.
 */

type Client = SupabaseClient<Database>;
export type ImageResult = { ok: true; id: string } | { ok: false; error: string };

export const BUCKET = "catalog-public";
const ONE_YEAR_SECONDS = "31536000";

export type ProductImage = Pick<
  Database["public"]["Tables"]["catalog_product_images"]["Row"],
  "id" | "product_id" | "storage_path" | "width" | "height" | "position" | "alt"
>;

const IMAGE_COLUMNS = "id, product_id, storage_path, width, height, position, alt";

export async function listProductImages(supabase: Client, tenantId: string, productId: string): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from("catalog_product_images")
    .select(IMAGE_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .order("position")
    .order("created_at");
  if (error) throw new Error(`No se pudieron leer las fotos: ${error.message}`);
  return data;
}

/** Primera foto de cada producto (para los listados). */
export async function firstImageByProduct(
  supabase: Client,
  tenantId: string,
  productIds: string[],
): Promise<Map<string, ProductImage>> {
  const result = new Map<string, ProductImage>();
  if (productIds.length === 0) return result;

  const { data, error } = await supabase
    .from("catalog_product_images")
    .select(IMAGE_COLUMNS)
    .eq("tenant_id", tenantId)
    .in("product_id", productIds)
    .order("position")
    .order("created_at");
  if (error) throw new Error(`No se pudieron leer las fotos: ${error.message}`);

  for (const image of data) {
    if (!result.has(image.product_id)) result.set(image.product_id, image);
  }
  return result;
}

function objectNames(storagePath: string): string[] {
  return IMAGE_SIZES.map((size) => imageObjectName(storagePath, size));
}

/** Rutas de los archivos de todas las fotos de un producto (para borrarlos junto con él). */
export async function productImageObjects(supabase: Client, tenantId: string, productId: string): Promise<string[]> {
  const images = await listProductImages(supabase, tenantId, productId);
  return images.flatMap((image) => objectNames(image.storage_path));
}

export async function removeObjects(supabase: Client, names: string[]): Promise<void> {
  if (names.length > 0) await supabase.storage.from(BUCKET).remove(names);
}

/**
 * Sube los dos tamaños y registra la foto. Si algo falla en el medio, borra lo subido.
 * El límite de fotos del plan lo garantiza la base (trigger); su mensaje se muestra tal cual.
 */
export async function addProductImage(
  supabase: Client,
  tenantId: string,
  productId: string,
  image: ProcessedImage,
): Promise<ImageResult> {
  const { data: product } = await supabase
    .from("catalog_products")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { ok: false, error: "El producto no existe." };

  const imageId = crypto.randomUUID();
  const storagePath = `${tenantId}/products/${productId}/${imageId}`;
  const uploaded: string[] = [];

  for (const size of IMAGE_SIZES) {
    const name = imageObjectName(storagePath, size);
    const { error } = await supabase.storage.from(BUCKET).upload(name, image.files[size], {
      contentType: "image/webp",
      cacheControl: ONE_YEAR_SECONDS,
      upsert: false,
    });
    if (error) {
      await removeObjects(supabase, uploaded);
      return { ok: false, error: "No pudimos guardar la foto. Probá de nuevo." };
    }
    uploaded.push(name);
  }

  const { data: last } = await supabase
    .from("catalog_product_images")
    .select("position")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("catalog_product_images").insert({
    id: imageId,
    tenant_id: tenantId,
    product_id: productId,
    storage_path: storagePath,
    width: image.width,
    height: image.height,
    position: (last?.position ?? 0) + 1,
  });

  if (error) {
    await removeObjects(supabase, uploaded);
    return {
      ok: false,
      error: error.code === "P0001" ? error.message : "No pudimos guardar la foto. Probá de nuevo.",
    };
  }
  return { ok: true, id: imageId };
}

export async function deleteProductImage(supabase: Client, tenantId: string, imageId: string): Promise<ImageResult> {
  const { data, error } = await supabase
    .from("catalog_product_images")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", imageId)
    .select("storage_path")
    .maybeSingle();
  if (error) return { ok: false, error: "No pudimos borrar la foto. Probá de nuevo." };
  if (!data) return { ok: false, error: "La foto no existe." };

  await removeObjects(supabase, objectNames(data.storage_path));
  return { ok: true, id: imageId };
}

/** Mueve una foto un lugar (la primera es la que se muestra en los listados). */
export async function moveProductImage(
  supabase: Client,
  tenantId: string,
  imageId: string,
  direction: "up" | "down",
): Promise<ImageResult> {
  const { data: image } = await supabase
    .from("catalog_product_images")
    .select("product_id")
    .eq("tenant_id", tenantId)
    .eq("id", imageId)
    .maybeSingle();
  if (!image) return { ok: false, error: "La foto no existe." };

  const images = await listProductImages(supabase, tenantId, image.product_id);
  const order = images.map((i) => i.id);
  const index = order.indexOf(imageId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= order.length) return { ok: true, id: imageId };
  [order[index], order[target]] = [order[target], order[index]];

  for (const [i, id] of order.entries()) {
    if (images.find((img) => img.id === id)?.position === i + 1) continue;
    const { error } = await supabase
      .from("catalog_product_images")
      .update({ position: i + 1 })
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) return { ok: false, error: "No pudimos ordenar las fotos." };
  }
  return { ok: true, id: imageId };
}
