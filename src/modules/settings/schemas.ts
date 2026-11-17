import { z } from "zod";
import { isValidSlug } from "@/core/tenancy/slug";
import { parseAmountToCents } from "@/lib/money";

/**
 * Validación de lo que el dueño carga en el asistente y en Ajustes (diseño, sección 10).
 * Los mismos límites están en la base (CHECK de tenant_settings y business_hours).
 */

/** Pasos del asistente. "Guardar y seguir" manda el siguiente; en Ajustes no se manda. */
export const WIZARD_STEPS = ["marca", "contacto", "horarios", "productos", "publicar"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const STEP_LABEL: Record<WizardStep, string> = {
  marca: "Tu marca",
  contacto: "Contacto y entrega",
  horarios: "Horarios",
  productos: "Productos",
  publicar: "Publicar",
};

/** "+54 9 2954 12-3456" → "+5492954123456". El número va con código de país (E.164). */
export function normalizeWhatsapp(value: string): string {
  return value.replace(/[\s()-]/g, "");
}

const whatsapp = z
  .string()
  .transform(normalizeWhatsapp)
  .pipe(z.string().regex(/^\+[1-9][0-9]{7,14}$/, "Escribí el WhatsApp con código de país, por ejemplo +54 9 2954 123456."));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

/** Colores de marca que puede elegir el comercio: todos con texto blanco legible (AA). */
export const BRAND_PALETTE = [
  "#c2410c",
  "#b91c1c",
  "#9d174d",
  "#7e22ce",
  "#1d4ed8",
  "#0f766e",
  "#4d7c0f",
  "#78350f",
  "#334155",
] as const;

export const provisionSchema = z.object({
  name: z.string().trim().min(2, "Escribí el nombre del comercio.").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidSlug, "Usá de 3 a 40 letras, números o guiones (sin espacios ni acentos)."),
  businessType: z.string().regex(/^[a-z_]{2,40}$/, "Elegí un rubro."),
  whatsappPhone: whatsapp,
});

export const brandSchema = z.object({
  display_name: z.string().trim().min(2, "Escribí el nombre que ven tus clientes.").max(80),
  tagline: optionalText(120),
  description: optionalText(500),
  brand: z.enum(BRAND_PALETTE, { error: "Elegí un color de la lista." }),
});

export const contactSchema = z.object({
  whatsapp_phone: whatsapp,
  instagram: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@/, ""))
    .pipe(z.string().regex(/^[A-Za-z0-9._]{0,30}$/, "El usuario de Instagram tiene letras, números, puntos o guiones bajos."))
    .transform((value) => (value ? value : null)),
  address: optionalText(200),
  city: optionalText(80),
});

const money = (label: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === "") return 0;
      const cents = parseAmountToCents(value);
      if (cents === null) {
        ctx.addIssue({ code: "custom", message: `${label} no es válido: escribí, por ejemplo, 1.500.` });
        return z.NEVER;
      }
      return cents;
    });

export const deliverySchema = z
  .object({
    accepts_pickup: z.boolean(),
    accepts_delivery: z.boolean(),
    delivery_fee: money("El costo de envío"),
    min_order_amount: money("El pedido mínimo"),
  })
  .refine((d) => d.accepts_pickup || d.accepts_delivery, {
    message: "Elegí al menos una forma de entrega: retiro o envío.",
  });

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** Un día: cerrado, o uno o dos rangos. Si cierra antes de abrir, cruza la medianoche. */
export const hoursSchema = z
  .array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      opens_at: time,
      closes_at: time,
    }),
  )
  .max(14)
  .refine((ranges) => ranges.every((r) => r.opens_at !== r.closes_at), {
    message: "La hora de apertura y la de cierre no pueden ser iguales.",
  });

export type HoursInput = z.infer<typeof hoursSchema>;

/** Lee los horarios del formulario: open-{d}, opens-{d}-{n}, closes-{d}-{n} (n = 1 o 2). */
export function hoursFromForm(formData: FormData): unknown {
  const ranges: { weekday: number; opens_at: string; closes_at: string }[] = [];
  for (let weekday = 0; weekday <= 6; weekday++) {
    if (formData.get(`open-${weekday}`) !== "on") continue;
    for (const n of [1, 2]) {
      const opens = formData.get(`opens-${weekday}-${n}`);
      const closes = formData.get(`closes-${weekday}-${n}`);
      if (typeof opens === "string" && typeof closes === "string" && opens && closes) {
        ranges.push({ weekday, opens_at: opens, closes_at: closes });
      }
    }
  }
  return ranges;
}
