import { z } from "zod";
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
  })
  .refine((p) => p.compare_at_price === null || p.compare_at_price > p.price, {
    message: "El precio anterior tiene que ser mayor que el precio actual.",
    path: ["compare_at_price"],
  });
export type ProductForm = z.infer<typeof productFormSchema>;

export const idSchema = z.uuid();
export const directionSchema = z.enum(["up", "down"]);
export const productFlagSchema = z.enum(["is_published", "is_available", "is_featured"]);
export type ProductFlag = z.infer<typeof productFlagSchema>;

/** Primer mensaje de error legible de un resultado de Zod. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisá los datos del formulario.";
}
