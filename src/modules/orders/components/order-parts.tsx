import { Pill } from "@/ui/pill";
import { STATUS_LABEL, STATUS_TONE, type OrderStatus } from "../status";

/**
 * Piezas visuales de los pedidos en el panel. El estado se lee siempre como texto;
 * el color solo refuerza (STATUS_TONE: nuevo ámbar, confirmado azul, en preparación
 * violeta, listo verde, entregado neutro, cancelado rojo).
 */

export function StatusPill({ status }: { status: OrderStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill>;
}

export function FulfillmentLabel({ fulfillment }: { fulfillment: "pickup" | "delivery" }) {
  return <span>{fulfillment === "delivery" ? "Envío" : "Retiro"}</span>;
}
