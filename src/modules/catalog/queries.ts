import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Lecturas del catálogo para el panel. Siempre reciben el tenantId verificado por
 * requireTenantAccess y filtran por él; RLS vuelve a filtrar (dos barreras).
 */

type Client = SupabaseClient<Database>;

export type Category = Pick<
  Database["public"]["Tables"]["catalog_categories"]["Row"],
  "id" | "name" | "slug" | "description" | "position" | "is_visible"
>;

export type Product = Pick<
  Database["public"]["Tables"]["catalog_products"]["Row"],
  | "id"
  | "category_id"
  | "name"
  | "slug"
  | "description"
  | "price"
  | "compare_at_price"
  | "is_published"
  | "is_available"
  | "is_featured"
  | "position"
  | "tags"
  | "specs"
>;

const CATEGORY_COLUMNS = "id, name, slug, description, position, is_visible";
const PRODUCT_COLUMNS =
  "id, category_id, name, slug, description, price, compare_at_price, is_published, is_available, is_featured, position, tags, specs";

export async function listCategories(supabase: Client, tenantId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("catalog_categories")
    .select(CATEGORY_COLUMNS)
    .eq("tenant_id", tenantId)
    .order("position")
    .order("name");
  if (error) throw new Error(`No se pudieron leer las categorías: ${error.message}`);
  return data;
}

export async function getCategory(supabase: Client, tenantId: string, id: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from("catalog_categories")
    .select(CATEGORY_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer la categoría: ${error.message}`);
  return data;
}

/** `categoryId`: undefined = todas; null = solo las que no tienen categoría. */
export async function listProducts(
  supabase: Client,
  tenantId: string,
  filter: { categoryId?: string | null } = {},
): Promise<Product[]> {
  let query = supabase.from("catalog_products").select(PRODUCT_COLUMNS).eq("tenant_id", tenantId);
  if (filter.categoryId === null) query = query.is("category_id", null);
  else if (filter.categoryId) query = query.eq("category_id", filter.categoryId);

  const { data, error } = await query.order("position").order("name").limit(1000);
  if (error) throw new Error(`No se pudieron leer los productos: ${error.message}`);
  return data;
}

export async function getProduct(supabase: Client, tenantId: string, id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("catalog_products")
    .select(PRODUCT_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer el producto: ${error.message}`);
  return data;
}

export async function countProducts(supabase: Client, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from("catalog_products")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (error) throw new Error(`No se pudieron contar los productos: ${error.message}`);
  return count ?? 0;
}

/** Rubro del comercio: define qué etiquetas ofrece el formulario de producto. */
export async function getTemplateKey(supabase: Client, tenantId: string): Promise<string> {
  const { data } = await supabase.from("tenant_settings").select("template_key").eq("tenant_id", tenantId).maybeSingle();
  return data?.template_key ?? "general";
}
