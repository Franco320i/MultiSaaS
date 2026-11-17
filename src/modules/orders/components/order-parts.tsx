import { STATUS_LABEL, type OrderStatus } from "../status";

/**
 * Piezas visuales de los pedidos en el panel. El estado se lee siempre como texto;
 * el color solo refuerza (nuevo = acento, cancelado = rojo, el resto neutro).
 */

export function StatusPill({ status }: { status: OrderStatus }) {
  const tone =
    status === "new"
      ? "bg-accent text-accent-foreground"
      : status === "cancelled"
        ? "bg-danger-soft text-danger"
        : "bg-surface-muted text-foreground";
  return <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${tone}`}>{STATUS_LABEL[status]}</span>;
}

export function FulfillmentLabel({ fulfillment }: { fulfillment: "pickup" | "delivery" }) {
  return <span>{fulfillment === "delivery" ? "Envío" : "Retiro"}</span>;
}
