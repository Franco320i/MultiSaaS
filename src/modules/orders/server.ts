import "server-only";

/**
 * Entrada de servidor del módulo pedidos, para el Route Handler POST /api/orders.
 * Se separa de index.ts para que ningún componente de cliente arrastre código de servidor.
 */
export { createOrder, withinRateLimits } from "./create";
export { acceptsOrdersNow, submitOrder, type SubmitResponse } from "./submit";
