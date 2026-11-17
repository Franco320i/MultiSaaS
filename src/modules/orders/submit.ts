import "server-only";
import type { Storefront } from "@/core/tenancy/storefront";
import { isOpenAt } from "@/lib/hours";
import { hashIp } from "@/lib/ip";
import type { TurnstileVerifier } from "@/lib/turnstile";
import type { CreateOrderResult } from "./create";
import { orderRequestSchema, type OrderRequest } from "./schemas";
import { buildOrderMessage, plainMoney, whatsappUrl } from "./whatsapp";

/**
 * Flujo de un pedido en el servidor (diseño, sección 11, pasos 4 a 6), sin Next.js
 * para poder probarlo. El comercio llega ya resuelto desde el host (Storefront).
 * Orden: validar → abierto → Turnstile → límites → create_order → mensaje.
 * Errores públicos en castellano y genéricos: nunca detalles internos.
 */

export type SubmitResponse =
  | { status: 200; body: { number: number; created: boolean; whatsappUrl: string | null } }
  | { status: 400 | 404 | 409 | 429 | 500; body: { error: string; unavailable?: string[] } };

export type SubmitDeps = {
  verifyTurnstile: TurnstileVerifier;
  ipSalt: string;
  withinRateLimits: (tenantId: string, ipHash: string) => Promise<boolean>;
  createOrder: (tenantId: string, input: OrderRequest, ipHash: string) => Promise<CreateOrderResult>;
  now?: Date;
};

const fail = (status: 400 | 404 | 409 | 429 | 500, error: string, unavailable?: string[]): SubmitResponse => ({
  status,
  body: unavailable ? { error, unavailable } : { error },
});

/** Abierto según horario o modo manual. Sin horarios cargados y en automático, se acepta. */
export function acceptsOrdersNow(storefront: Storefront, now: Date): boolean {
  if (storefront.open_mode === "auto" && storefront.hours.length === 0) return true;
  return isOpenAt(storefront.hours, storefront.open_mode, now, storefront.timezone);
}

export async function submitOrder(
  storefront: Storefront,
  payload: unknown,
  ip: string | null,
  deps: SubmitDeps,
): Promise<SubmitResponse> {
  const parsed = orderRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message ?? "Revisá los datos del pedido.");
  }
  const input = parsed.data;

  if (!acceptsOrdersNow(storefront, deps.now ?? new Date())) {
    return fail(409, storefront.closed_message ?? "El local está cerrado ahora. Probá de nuevo en su horario.");
  }

  if (!(await deps.verifyTurnstile(input.turnstileToken, ip))) {
    return fail(400, "No pudimos verificar el envío. Recargá la página y probá de nuevo.");
  }

  const ipHash = hashIp(ip, deps.ipSalt);
  if (!(await deps.withinRateLimits(storefront.tenant_id, ipHash))) {
    return fail(429, "Hiciste muchos pedidos seguidos. Esperá unos minutos y probá de nuevo.");
  }

  const result = await deps.createOrder(storefront.tenant_id, input, ipHash);
  if (!result.ok) {
    switch (result.error) {
      case "products_unavailable":
        return fail(409, "Algunos productos ya no están disponibles. Los sacamos de tu pedido.", result.unavailable);
      case "below_minimum":
        return fail(409, `El pedido mínimo es ${plainMoney(storefront.min_order_amount, storefront.currency)}.`);
      case "fulfillment_not_available":
        return fail(
          400,
          input.fulfillment === "delivery" ? "Este local no hace envíos." : "Este local no tiene retiro en el local.",
        );
      case "tenant_unavailable":
      case "orders_disabled":
        return fail(409, "Este local no está tomando pedidos por ahora.");
      case "invalid_customer":
        return fail(400, "Revisá tu nombre, teléfono y dirección.");
      case "invalid_items":
      case "invalid_order":
        return fail(400, "Revisá los datos del pedido.");
      default:
        return fail(500, "No pudimos registrar el pedido. Probá de nuevo en unos segundos.");
    }
  }

  const message = buildOrderMessage(result.order, storefront.display_name, storefront.currency);
  return {
    status: 200,
    body: {
      number: result.order.number,
      created: result.order.created,
      whatsappUrl: whatsappUrl(storefront.whatsapp_phone, message),
    },
  };
}
