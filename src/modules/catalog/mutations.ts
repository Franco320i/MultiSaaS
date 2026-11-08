import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { slugify, slugWithSuffix } from "@/lib/slugify";
import type { Database } from "@/types/database";
import { productImageObjects, removeObjects } from "./images";
import type { CategoryForm, ProductFlag, ProductForm } from "./schemas";

/**
 * Escrituras del catálogo. Sin dependencias de Next.js para poder probarlas contra
 * la base local con sesiones reales. Reciben el tenantId YA verificado por
 * requireTenantAccess: nunca un id que venga del navegador.
 */

type Client = SupabaseClient<Database>;
export type MutationResult = { ok: true; id: string } | { ok: false; error: string };

const MAX_SLUG_ATTEMPTS = 25;

/** Mensajes para el usuario. Nunca se muestran detalles internos de la base. */
function toUserError(error: PostgrestError): string {
  switch (error.code) {
    case "P0001": // nuestros RAISE EXCEPTION (límites de plan): mensaje escrito por nosotros
      return error.message;
    case "23503":
      return "La categoría elegida no existe.";
    case "23514":
      return "Algún dato no tiene un formato válido.";
    case "42501":
      return "No tenés permiso para hacer esto.";
    default:
      return "No pudimos guardar los cambios. Probá de nuevo.";
  }
}

function isSlugConflict(error: PostgrestError): boolean {
  return error.code === "23505" && error.message.includes("slug");
}

async function nextPosition(
  supabase: Client,
  table: "catalog_categories" | "catalog_products",
  tenantId: string,
): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select("position")
    .eq("tenant_id", tenantId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? 0) + 1;
}

// -----------------------------------------------------------------------------
// Categorías
// -----------------------------------------------------------------------------

export async function createCategory(supabase: Client, tenantId: string, form: CategoryForm): Promise<MutationResult> {
  const base = slugify(form.name, 80);
  const position = await nextPosition(supabase, "catalog_categories", tenantId);

  for (let n = 1; n <= MAX_SLUG_ATTEMPTS; n++) {
    const { data, error } = await supabase
      .from("catalog_categories")
      .insert({ tenant_id: tenantId, name: form.name, description: form.description, is_visible: form.is_visible, position, slug: slugWithSuffix(base, n, 80) })
      .select("id")
      .single();
    if (!error) return { ok: true, id: data.id };
    if (!isSlugConflict(error)) return { ok: false, error: toUserError(error) };
  }
  return { ok: false, error: "Ya existen demasiadas categorías con ese nombre." };
}

/** El slug no cambia al renombrar: los enlaces ya compartidos siguen funcionando. */
export async function updateCategory(
  supabase: Client,
  tenantId: string,
  id: string,
  form: CategoryForm,
): Promise<MutationResult> {
  const { data, error } = await supabase
    .from("catalog_categories")
    .update({ name: form.name, description: form.description, is_visible: form.is_visible })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: toUserError(error) };
  return data ? { ok: true, id: data.id } : { ok: false, error: "La categoría no existe." };
}

/** Sus productos quedan "sin categoría" (FK con on delete set null). */
export async function deleteCategory(supabase: Client, tenantId: string, id: string): Promise<MutationResult> {
  const { data, error } = await supabase
    .from("catalog_categories")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: toUserError(error) };
  return data ? { ok: true, id: data.id } : { ok: false, error: "La categoría no existe." };
}

// -----------------------------------------------------------------------------
// Productos
// -----------------------------------------------------------------------------

function productValues(form: ProductForm) {
  return {
    name: form.name,
    description: form.description,
    category_id: form.category_id,
    price: form.price,
    compare_at_price: form.compare_at_price,
    is_published: form.is_published,
    is_available: form.is_available,
    is_featured: form.is_featured,
  };
}

export async function createProduct(supabase: Client, tenantId: string, form: ProductForm): Promise<MutationResult> {
  const base = slugify(form.name, 120);
  const position = await nextPosition(supabase, "catalog_products", tenantId);

  for (let n = 1; n <= MAX_SLUG_ATTEMPTS; n++) {
    const { data, error } = await supabase
      .from("catalog_products")
      .insert({ tenant_id: tenantId, ...productValues(form), position, slug: slugWithSuffix(base, n, 120) })
      .select("id")
      .single();
    if (!error) return { ok: true, id: data.id };
    if (!isSlugConflict(error)) return { ok: false, error: toUserError(error) };
  }
  return { ok: false, error: "Ya existen demasiados productos con ese nombre." };
}

export async function updateProduct(
  supabase: Client,
  tenantId: string,
  id: string,
  form: ProductForm,
): Promise<MutationResult> {
  const { data, error } = await supabase
    .from("catalog_products")
    .update(productValues(form))
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: toUserError(error) };
  return data ? { ok: true, id: data.id } : { ok: false, error: "El producto no existe." };
}

export async function setProductFlag(
  supabase: Client,
  tenantId: string,
  id: string,
  flag: ProductFlag,
  value: boolean,
): Promise<MutationResult> {
  const values =
    flag === "is_published" ? { is_published: value } : flag === "is_available" ? { is_available: value } : { is_featured: value };
  const { data, error } = await supabase
    .from("catalog_products")
    .update(values)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: toUserError(error) };
  return data ? { ok: true, id: data.id } : { ok: false, error: "El producto no existe." };
}

/** Las filas de fotos se borran solas (cascade); los archivos de Storage se borran acá. */
export async function deleteProduct(supabase: Client, tenantId: string, id: string): Promise<MutationResult> {
  const objects = await productImageObjects(supabase, tenantId, id);
  const result = await deleteProductRow(supabase, tenantId, id);
  if (result.ok) await removeObjects(supabase, objects);
  return result;
}

async function deleteProductRow(supabase: Client, tenantId: string, id: string): Promise<MutationResult> {
  const { data, error } = await supabase
    .from("catalog_products")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: toUserError(error) };
  return data ? { ok: true, id: data.id } : { ok: false, error: "El producto no existe." };
}

// -----------------------------------------------------------------------------
// Orden (subir / bajar)
// -----------------------------------------------------------------------------

/**
 * Intercambia la posición con el vecino y renumera 1..n el grupo para que no
 * queden posiciones repetidas. Productos: el grupo es su categoría.
 */
export async function move(
  supabase: Client,
  table: "catalog_categories" | "catalog_products",
  tenantId: string,
  id: string,
  direction: "up" | "down",
): Promise<MutationResult> {
  let rows: { id: string; position: number }[];

  if (table === "catalog_products") {
    const { data: product } = await supabase
      .from("catalog_products")
      .select("category_id")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    if (!product) return { ok: false, error: "El producto no existe." };

    let query = supabase.from("catalog_products").select("id, position").eq("tenant_id", tenantId);
    query = product.category_id ? query.eq("category_id", product.category_id) : query.is("category_id", null);
    const { data, error } = await query.order("position").order("id");
    if (error) return { ok: false, error: toUserError(error) };
    rows = data;
  } else {
    const { data, error } = await supabase
      .from("catalog_categories")
      .select("id, position")
      .eq("tenant_id", tenantId)
      .order("position")
      .order("id");
    if (error) return { ok: false, error: toUserError(error) };
    rows = data;
  }

  const order = rows.map((row) => row.id);
  const index = order.indexOf(id);
  if (index === -1) return { ok: false, error: "No existe." };
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= order.length) return { ok: true, id };

  [order[index], order[target]] = [order[target], order[index]];

  for (const [i, rowId] of order.entries()) {
    const current = rows.find((row) => row.id === rowId);
    if (current?.position === i + 1) continue;
    const { error: updateError } = await supabase
      .from(table)
      .update({ position: i + 1 })
      .eq("tenant_id", tenantId)
      .eq("id", rowId);
    if (updateError) return { ok: false, error: toUserError(updateError) };
  }
  return { ok: true, id };
}
