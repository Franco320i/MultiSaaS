/**
 * Estados del pedido (diseño, sección 11). La base hace cumplir las transiciones
 * (trigger private.check_order_status_change); acá están los textos y el siguiente paso.
 */

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

/** Botón del paso siguiente (verbo + objeto, lenguaje de mostrador). */
export const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  new: { status: "confirmed", label: "Confirmar pedido" },
  confirmed: { status: "preparing", label: "Empezar a preparar" },
  preparing: { status: "ready", label: "Marcar como listo" },
  ready: { status: "completed", label: "Marcar como entregado" },
};

export const OPEN_STATUSES: OrderStatus[] = ["new", "confirmed", "preparing", "ready"];
export const CLOSED_STATUSES: OrderStatus[] = ["completed", "cancelled"];

export function canCancel(status: OrderStatus): boolean {
  return OPEN_STATUSES.includes(status);
}
