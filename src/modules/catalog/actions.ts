"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ImageError, MAX_UPLOAD_BYTES, processProductImage, type ProcessedImage } from "@/lib/images/process";
import { revalidatePublicCatalog } from "./cache";
import * as images from "./images";
import { parseSpreadsheet, type ParsedImport } from "./import";
import * as mutations from "./mutations";
import {
  categoryFormSchema,
  directionSchema,
  firstError,
  idSchema,
  productFlagSchema,
  productFormFromData,
  productFormSchema,
} from "./schemas";

/**
 * Server Actions del catálogo. Son endpoints públicos: cada una verifica el acceso
 * con requireTenantAccess (el comercio sale del slug de la ruta y se valida contra
 * tenant_members) y valida con Zod todo lo demás. El tenantId que se usa para
 * escribir es siempre el verificado, nunca uno que mande el navegador.
 *
 * Después de crear o editar se redirige a rutas de comercio (`/alfa/...`), que caen
 * en una navegación normal a través del proxy (ver "Trampas" en CLAUDE.md).
 */

/**
 * `fields`: lo que se envió, para volver a mostrarlo si hay un error (React vacía
 * el formulario después de cada envío; sin esto se pierde lo escrito).
 */
export type FormState = { error?: string; fields?: Record<string, string> };

const FORM_FIELDS = ["name", "description", "category_id", "price", "compare_at_price", "is_published", "is_available", "is_featured", "is_visible"];

function submitted(formData: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const key of FORM_FIELDS) {
    const value = formData.get(key);
    if (typeof value === "string") fields[key] = value.slice(0, 2000);
  }
  // Campos repetidos: etiquetas separadas por coma y filas de características en JSON.
  const raw = productFormFromData(formData);
  if (Array.isArray(raw.tags) && raw.tags.length > 0) fields.tags = raw.tags.join(",");
  if (Array.isArray(raw.specs) && raw.specs.length > 0) fields.specs = JSON.stringify(raw.specs).slice(0, 4000);
  return fields;
}

async function context(tenantSlug: string) {
  const access = await requireTenantAccess(tenantSlug, "catalog.write");
  const supabase = await createSupabaseServerClient();
  return { access, supabase };
}

// -----------------------------------------------------------------------------
// Categorías
// -----------------------------------------------------------------------------

export async function createCategoryAction(tenantSlug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { access, supabase } = await context(tenantSlug);
  const parsed = categoryFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), fields: submitted(formData) };

  const result = await mutations.createCategory(supabase, access.tenantId, parsed.data);
  if (!result.ok) return { error: result.error, fields: submitted(formData) };
  revalidatePublicCatalog(access.tenantId);
  redirect(`/${access.slug}/categorias`);
}

export async function updateCategoryAction(
  tenantSlug: string,
  categoryId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { access, supabase } = await context(tenantSlug);
  const id = idSchema.safeParse(categoryId);
  const parsed = categoryFormSchema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { error: "La categoría no existe." };
  if (!parsed.success) return { error: firstError(parsed.error), fields: submitted(formData) };

  const result = await mutations.updateCategory(supabase, access.tenantId, id.data, parsed.data);
  if (!result.ok) return { error: result.error, fields: submitted(formData) };
  revalidatePublicCatalog(access.tenantId);
  redirect(`/${access.slug}/categorias`);
}

export async function deleteCategoryAction(tenantSlug: string, categoryId: string): Promise<FormState> {
  const { access, supabase } = await context(tenantSlug);
  const id = idSchema.safeParse(categoryId);
  if (!id.success) return { error: "La categoría no existe." };

  const result = await mutations.deleteCategory(supabase, access.tenantId, id.data);
  if (!result.ok) return { error: result.error };
  revalidatePublicCatalog(access.tenantId);
  redirect(`/${access.slug}/categorias`);
}

export async function moveCategoryAction(tenantSlug: string, categoryId: string, direction: string): Promise<void> {
  const { access, supabase } = await context(tenantSlug);
  const id = idSchema.safeParse(categoryId);
  const dir = directionSchema.safeParse(direction);
  if (!id.success || !dir.success) return;

  await mutations.move(supabase, "catalog_categories", access.tenantId, id.data, dir.data);
  revalidatePublicCatalog(access.tenantId);
  refresh();
}

// -----------------------------------------------------------------------------
// Productos
// -----------------------------------------------------------------------------

export async function createProductAction(tenantSlug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { access, supabase } = await context(tenantSlug);
  const parsed = productFormSchema.safeParse(productFormFromData(formData));
  if (!parsed.success) return { error: firstError(parsed.error), fields: submitted(formData) };

  const result = await mutations.createProduct(supabase, access.tenantId, parsed.data);
  if (!result.ok) return { error: result.error, fields: submitted(formData) };
  revalidatePublicCatalog(access.tenantId);
  // Recién creado: se abre su edición para sumarle fotos (las fotos necesitan el producto guardado).
  redirect(`/${access.slug}/productos/${result.id}?nuevo=1`);
}

export async function updateProductAction(
  tenantSlug: string,
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { access, supabase } = await context(tenantSlug);
  const id = idSchema.safeParse(productId);
  const parsed = productFormSchema.safeParse(productFormFromData(formData));
  if (!id.success) return { error: "El producto no existe." };
  if (!parsed.success) return { error: firstError(parsed.error), fields: submitted(formData) };

  const result = await mutations.updateProduct(supabase, access.tenantId, id.data, parsed.data);
  if (!result.ok) return { error: result.error, fields: submitted(formData) };
  revalidatePublicCatalog(access.tenantId);
  redirect(`/${access.slug}/productos`);
}

export async function deleteProductAction(tenantSlug: string, productId: string): Promise<FormState> {
  const { access, supabase } = await context(tenantSlug);
  const id = idSchema.safeParse(productId);
  if (!id.success) return { error: "El producto no existe." };

  const result = await mutations.deleteProduct(supabase, access.tenantId, id.data);
  if (!result.ok) return { error: result.error };
  revalidatePublicCatalog(access.tenantId);
  redirect(`/${access.slug}/productos`);
}

export async function setProductFlagAction(
  tenantSlug: string,
  productId: string,
  flag: string,
  value: boolean,
): Promise<void> {
  const { access, supabase } = await context(tenantSlug);
  const id = idSchema.safeParse(productId);
  const parsedFlag = productFlagSchema.safeParse(flag);
  if (!id.success || !parsedFlag.success || typeof value !== "boolean") return;

  await mutations.setProductFlag(supabase, access.tenantId, id.data, parsedFlag.data, value);
  revalidatePublicCatalog(access.tenantId);
  refresh();
}

export async function moveProductAction(tenantSlug: string, productId: string, direction: string): Promise<void> {
  const { access, supabase } = await context(tenantSlug);
  const id = idSchema.safeParse(productId);
  const dir = directionSchema.safeParse(direction);
  if (!id.success || !dir.success) return;

  await mutations.move(supabase, "catalog_products", access.tenantId, id.data, dir.data);
  revalidatePublicCatalog(access.tenantId);
  refresh();
}

// -----------------------------------------------------------------------------
// Fotos de productos
// -----------------------------------------------------------------------------

/**
 * Recibe la foto (ya achicada en el navegador), la re-procesa con sharp y la guarda.
 * El navegador solo manda el archivo: el comercio sale del slug verificado y la ruta
 * en Storage la arma el servidor.
 */
export async function uploadProductImageAction(
  tenantSlug: string,
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { access, supabase } = await context(tenantSlug);
  const id = idSchema.safeParse(productId);
  if (!id.success) return { error: "El producto no existe." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elegí una foto." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "La foto pesa demasiado (máximo 4 MB)." };

  let processed: ProcessedImage;
  try {
    processed = await processProductImage(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    return { error: error instanceof ImageError ? error.message : "No pudimos procesar la foto. Probá con otra." };
  }

  const result = await images.addProductImage(supabase, access.tenantId, id.data, processed);
  if (!result.ok) return { error: result.error };
  revalidatePublicCatalog(access.tenantId);
  refresh();
  return {};
}

export async function deleteProductImageAction(tenantSlug: string, imageId: string): Promise<void> {
  const { access, supabase } = await context(tenantSlug);
  const id = idSchema.safeParse(imageId);
  if (!id.success) return;
  await images.deleteProductImage(supabase, access.tenantId, id.data);
  revalidatePublicCatalog(access.tenantId);
  refresh();
}

export async function moveProductImageAction(tenantSlug: string, imageId: string, direction: string): Promise<void> {
  const { access, supabase } = await context(tenantSlug);
  const id = idSchema.safeParse(imageId);
  const dir = directionSchema.safeParse(direction);
  if (!id.success || !dir.success) return;
  await images.moveProductImage(supabase, access.tenantId, id.data, dir.data);
  revalidatePublicCatalog(access.tenantId);
  refresh();
}

// -----------------------------------------------------------------------------
// Importar desde planilla
// -----------------------------------------------------------------------------

export type ImportState = {
  error?: string;
  text?: string;
  preview?: ParsedImport;
  result?: mutations.ImportResult;
};

const MAX_IMPORT_TEXT = 200_000;

function importText(formData: FormData): string | null {
  const text = formData.get("text");
  return typeof text === "string" && text.length <= MAX_IMPORT_TEXT ? text : null;
}

/** Paso 1: revisar lo pegado y mostrar los errores por fila, sin guardar nada. */
export async function previewImportAction(tenantSlug: string, _prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireTenantAccess(tenantSlug, "catalog.write");
  const text = importText(formData);
  if (text === null) return { error: "Lo pegado es demasiado largo. Importá de a partes (hasta 300 filas)." };
  const preview = parseSpreadsheet(text);
  if (preview.rows.length === 0) return { error: "No encontramos filas. Copiá las celdas de la planilla y pegalas acá.", text };
  return { text, preview };
}

/** Paso 2: crear los productos de las filas válidas (el texto se vuelve a validar acá). */
export async function importProductsAction(tenantSlug: string, _prev: ImportState, formData: FormData): Promise<ImportState> {
  const { access, supabase } = await context(tenantSlug);
  const text = importText(formData);
  if (text === null) return { error: "Lo pegado es demasiado largo. Importá de a partes (hasta 300 filas)." };
  const parsed = parseSpreadsheet(text);
  const valid = parsed.rows
    .filter((row) => row.errors.length === 0 && row.price !== null)
    .map((row) => ({ line: row.line, category: row.category, name: row.name, description: row.description, price: row.price as number }));
  if (valid.length === 0) return { error: "No hay filas para importar: corregí los errores y probá de nuevo.", text, preview: parsed };

  const result = await mutations.importProducts(supabase, access.tenantId, valid);
  if (result.created > 0) revalidatePublicCatalog(access.tenantId);
  refresh();
  return { result };
}
