import { z } from "zod";

/**
 * Lo que manda el navegador al crear un pedido (diseño, sección 11, paso 3).
 * Solo IDs y cantidades: ni precios, ni totales, ni comercio (sale del host).
 * Los mismos límites los vuelve a controlar private.create_order en la base.
 */

export const PHONE_PATTERN = /^\+?[0-9 ()-]{6,30}$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const orderRequestSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.uuid(),
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .min(1, "El pedido está vacío.")
      .max(50, "El pedido tiene demasiados productos."),
    customerName: z.string().trim().min(2, "Escribí tu nombre.").max(80),
    customerPhone: z.string().trim().regex(PHONE_PATTERN, "Escribí un teléfono válido, por ejemplo 2954 123456."),
    fulfillment: z.enum(["pickup", "delivery"]),
    deliveryAddress: optionalText(200),
    notes: optionalText(500),
    idempotencyKey: z.uuid(),
    turnstileToken: z.string().min(1).max(2048),
  })
  .refine((order) => order.fulfillment === "pickup" || (order.deliveryAddress?.length ?? 0) >= 3, {
    message: "Escribí la dirección de entrega.",
    path: ["deliveryAddress"],
  });

export type OrderRequest = z.infer<typeof orderRequestSchema>;

/** Resumen que devuelve private.create_order. */
export const orderSummarySchema = z.object({
  order_id: z.uuid(),
  number: z.number().int().positive(),
  created: z.boolean(),
  fulfillment: z.enum(["pickup", "delivery"]),
  customer_name: z.string(),
  delivery_address: z.string().nullable(),
  notes: z.string().nullable(),
  subtotal: z.number().int(),
  delivery_fee: z.number().int(),
  total: z.number().int(),
  items: z.array(
    z.object({
      product_name: z.string(),
      quantity: z.number().int(),
      unit_price: z.number().int(),
      line_total: z.number().int(),
    }),
  ),
});

export type OrderSummary = z.infer<typeof orderSummarySchema>;
