import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { orderSummarySchema, type OrderRequest, type OrderSummary } from "./schemas";

/**
 * Único archivo del módulo que usa la clave secreta (lista cerrada en eslint.config.mjs).
 * Recibe el tenantId resuelto por el servidor a partir del host; nunca uno del navegador.
 * Los precios y totales los calcula private.create_order en la base.
 */

export type CreateOrderError =
  | "products_unavailable"
  | "options_invalid"
  | "below_minimum"
  | "fulfillment_not_available"
  | "tenant_unavailable"
  | "orders_disabled"
  | "invalid_customer"
  | "invalid_items"
  | "invalid_order"
  | "unknown";

export type CreateOrderResult =
  | { ok: true; order: OrderSummary }
  | { ok: false; error: CreateOrderError; unavailable?: string[] };

const KNOWN_ERRORS = new Set<CreateOrderError>([
  "products_unavailable",
  "options_invalid",
  "below_minimum",
  "fulfillment_not_available",
  "tenant_unavailable",
  "orders_disabled",
  "invalid_customer",
  "invalid_items",
  "invalid_order",
]);

function parseIds(details: string | null | undefined): string[] {
  try {
    const value: unknown = JSON.parse(details ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function createOrder(tenantId: string, input: OrderRequest, ipHash: string): Promise<CreateOrderResult> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_tenant_id: tenantId,
    p_order: {
      idempotency_key: input.idempotencyKey,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      fulfillment: input.fulfillment,
      delivery_address: input.deliveryAddress ?? null,
      notes: input.notes ?? null,
      client_ip_hash: ipHash,
      items: input.items.map((item) => ({ product_id: item.productId, option_ids: item.optionIds, quantity: item.quantity })),
    },
  });

  if (error) {
    const code = error.message as CreateOrderError;
    if (error.code === "P0001" && KNOWN_ERRORS.has(code)) {
      if (code === "products_unavailable") return { ok: false, error: code, unavailable: parseIds(error.details) };
      // options_invalid trae el id del producto (texto), no una lista.
      if (code === "options_invalid") return { ok: false, error: code, unavailable: error.details ? [error.details] : [] };
      return { ok: false, error: code };
    }
    console.error("create_order falló", { code: error.code, message: error.message });
    return { ok: false, error: "unknown" };
  }

  const parsed = orderSummarySchema.safeParse(data);
  if (!parsed.success) {
    console.error("create_order devolvió un resumen inesperado");
    return { ok: false, error: "unknown" };
  }
  return { ok: true, order: parsed.data };
}

/** Límites del diseño: 5 pedidos cada 10 minutos por IP y comercio; 200 por hora por comercio. */
export async function withinRateLimits(tenantId: string, ipHash: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const checks = [
    { key: `orders:ip:${tenantId}:${ipHash}`, window: 600, limit: 5 },
    { key: `orders:tenant:${tenantId}`, window: 3600, limit: 200 },
  ];
  for (const check of checks) {
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_key: check.key,
      p_window_seconds: check.window,
      p_limit: check.limit,
    });
    if (error) throw new Error(`No se pudo controlar el límite de pedidos: ${error.message}`);
    if (data !== true) return false;
  }
  return true;
}
