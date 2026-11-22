import { z } from "zod";
import { MAX_SPECS, MAX_TAGS, PRODUCT_TAG_VALUES, SPEC_LABEL_MAX, SPEC_VALUE_MAX } from "@/lib/catalog-options";
import { parseAmountToCents } from "@/lib/money";

/**
 * Validación de todo lo que entra al servidor desde los formularios del catálogo.
 * Los límites coinciden con los CHECK de la base (20261108102436_catalog_categories_products.sql).
 */

// Mensajes de validación por defecto en castellano.
z.config(z.locales.es());

/** Casilla de un formulario HTML: si no está tildada, el campo directamente no llega. */
const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

const amount = (field: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      const cents = parseAmountToCents(value);
      if (cents === null) {
        ctx.addIssue({ code: "custom", message: `${field}: ingresá un monto válido, por ejemplo 18.000 o 18.000,50.` });
        return z.NEVER;
      }
      return cents;
    });

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(60, "Máximo 60 caracteres."),
  description: optionalText(300),
  is_visible: checkbox,
});
export type CategoryForm = z.infer<typeof categoryFormSchema>;

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio.").max(120, "Máximo 120 caracteres."),
    description: optionalText(2000),
    category_id: z
      .union([z.uuid(), z.literal("")])
      .nullish()
      .transform((value) => value || null),
    price: amount("Precio"),
    compare_at_price: z
      .string()
      .trim()
      .nullish()
      .transform((value, ctx) => {
        if (!value) return null;
        const cents = parseAmountToCents(value);
        if (cents === null) {
          ctx.addIssue({ code: "custom", message: "Precio anterior: ingresá un monto válido o dejalo vacío." });
          return z.NEVER;
        }
        return cents;
      }),
    is_published: checkbox,
    is_available: checkbox,
    is_featured: checkbox,
    // Llegan armadas por productFormFromData (casillas repetidas y filas de la tabla).
    tags: z
      .array(z.enum(PRODUCT_TAG_VALUES, { message: "Elegí etiquetas de la lista." }))
      .default([])
      .transform((list) => [...new Set(list)])
      .pipe(z.array(z.enum(PRODUCT_TAG_VALUES)).max(MAX_TAGS, `Elegí hasta ${MAX_TAGS} etiquetas.`)),
    specs: z
      .array(z.object({ label: z.string().trim(), value: z.string().trim() }))
      .default([])
      .transform((rows) => rows.filter((r) => r.label !== "" || r.value !== ""))
      .superRefine((rows, ctx) => {
        if (rows.length > MAX_SPECS) ctx.addIssue({ code: "custom", message: `Podés cargar hasta ${MAX_SPECS} características.` });
        for (const r of rows) {
          if (r.label === "") ctx.addIssue({ code: "custom", message: `Completá el nombre de la característica «${r.value}».` });
          else if (r.value === "") ctx.addIssue({ code: "custom", message: `Completá el valor de «${r.label}».` });
          else if (r.label.length > SPEC_LABEL_MAX) ctx.addIssue({ code: "custom", message: `El nombre «${r.label.slice(0, 20)}…» puede tener hasta ${SPEC_LABEL_MAX} letras.` });
          else if (r.value.length > SPEC_VALUE_MAX) ctx.addIssue({ code: "custom", message: `El valor de «${r.label}» puede tener hasta ${SPEC_VALUE_MAX} letras.` });
        }
      }),
  })
  .refine((p) => p.compare_at_price === null || p.compare_at_price > p.price, {
    message: "El precio anterior tiene que ser mayor que el precio actual.",
    path: ["compare_at_price"],
  });
export type ProductForm = z.infer<typeof productFormSchema>;

/**
 * Arma lo que valida productFormSchema a partir del formulario: Object.fromEntries pierde
 * los campos repetidos, así que las etiquetas (casillas "tags") y las filas de
 * características ("spec_label" / "spec_value", en orden) se leen con getAll.
 */
export function productFormFromData(formData: FormData): Record<string, unknown> {
  const labels = formData.getAll("spec_label").map(String);
  const values = formData.getAll("spec_value").map(String);
  const rest: Record<string, unknown> = Object.fromEntries(formData);
  delete rest.tags;
  delete rest.spec_label;
  delete rest.spec_value;
  return {
    ...rest,
    tags: formData.getAll("tags").map(String),
    specs: labels.map((label, i) => ({ label, value: values[i] ?? "" })),
  };
}

export const idSchema = z.uuid();
export const directionSchema = z.enum(["up", "down"]);
export const productFlagSchema = z.enum(["is_published", "is_available", "is_featured"]);
export type ProductFlag = z.infer<typeof productFlagSchema>;

/** Primer mensaje de error legible de un resultado de Zod. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisá los datos del formulario.";
}
