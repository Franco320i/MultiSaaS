/**
 * Estados del pedido (diseño, sección 11). La base hace cumplir las transiciones
 * (trigger private.check_order_status_change); acá están los textos y el siguiente paso.
 */

import type { PillTone } from "@/ui/pill";

export const ORDER_STATUSES = ["new", "confirmed", "preparing", "ready", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Nuevo",
  confirmed: "Confirmado",
  preparing: "En preparación",
  ready: "Listo",
  completed: "Entregado",
  cancelled: "Cancelado",
};

/** Color de la píldora de cada estado (el texto siempre acompaña). */
export const STATUS_TONE: Record<OrderStatus, PillTone> = {
  new: "warning",
  confirmed: "info",
  preparing: "plum",
  ready: "accent",
  completed: "neutral",
  cancelled: "danger",
};

/**
 * Botón del paso siguiente (verbo + objeto, lenguaje de mostrador). Recorrido en el panel:
 * Nuevo → Confirmado → Entregado, más Cancelar (decidido el 2026-11-26: el envío y la venta
 * se coordinan por WhatsApp; "En preparación" y "Listo" no le servían a nadie). Siguen
 * existiendo en la base para los pedidos viejos, que pasan directo a entregado. La base
 * permite saltar pasos hacia adelante (private.check_order_status_change).
 */
export const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  new: { status: "confirmed", label: "Confirmar pedido" },
  confirmed: { status: "completed", label: "Marcar como entregado" },
  preparing: { status: "completed", label: "Marcar como entregado" },
  ready: { status: "completed", label: "Marcar como entregado" },
};

export const OPEN_STATUSES: OrderStatus[] = ["new", "confirmed", "preparing", "ready"];
export const CLOSED_STATUSES: OrderStatus[] = ["completed", "cancelled"];

export function canCancel(status: OrderStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

/** Aviso breve después de cambiar el estado: la fila cambia de grupo y puede desorientar. */
export function statusToast(orderNumber: number, status: OrderStatus): string {
  return `Pedido #${orderNumber} ${STATUS_LABEL[status].toLowerCase()}`;
}
