import { formatCents } from "@/lib/money";
import type { OrderSummary } from "./schemas";

/**
 * Mensaje de WhatsApp del pedido (diseño, sección 11, "Ejemplo de mensaje").
 * Lo arma el servidor con lo que guardó la base, nunca con lo que mandó el navegador.
 * Sin links al panel ni datos internos. Hasta ~1.500 caracteres para que la URL entre
 * en los teléfonos: primero se recortan las notas, después se resumen las líneas.
 */

export const MAX_MESSAGE_LENGTH = 1500;

/** "$ 18.000" con espacio común (Intl usa uno duro, que en la URL sale como %C2%A0). */
export function plainMoney(cents: number, currency = "ARS"): string {
  return formatCents(cents, currency).replace(/ /g, " ");
}

function compose(
  order: OrderSummary,
  storeName: string,
  currency: string,
  options: { notes: string | null; maxItems: number },
): string {
  const money = (cents: number) => plainMoney(cents, currency);
  const shown = order.items.slice(0, options.maxItems);
  const hidden = order.items.length - shown.length;

  const lines = [
    `Hola ${storeName}, quiero hacer este pedido:`,
    `Pedido #${order.number}`,
    ...shown.map((item) => `${item.quantity} x ${item.product_name} - ${money(item.line_total)}`),
    ...(hidden > 0 ? [`… y ${hidden} ${hidden === 1 ? "producto" : "productos"} más`] : []),
    `Subtotal: ${money(order.subtotal)}`,
    ...(order.fulfillment === "delivery" ? [`Envío: ${money(order.delivery_fee)}`] : []),
    `Total: ${money(order.total)}`,
    order.fulfillment === "delivery" ? `Entrega: envío a ${order.delivery_address}` : "Entrega: retiro en el local",
    `Nombre: ${order.customer_name}`,
    ...(options.notes ? [`Notas: ${options.notes}`] : []),
  ];
  return lines.join("\n");
}

export function buildOrderMessage(order: OrderSummary, storeName: string, currency = "ARS"): string {
  const full = compose(order, storeName, currency, { notes: order.notes, maxItems: order.items.length });
  if (full.length <= MAX_MESSAGE_LENGTH) return full;

  // 1. Recortar las notas.
  if (order.notes) {
    const withoutNotes = compose(order, storeName, currency, { notes: null, maxItems: order.items.length });
    const room = MAX_MESSAGE_LENGTH - withoutNotes.length - "\nNotas: …".length;
    if (room >= 20) {
      return compose(order, storeName, currency, { notes: `${order.notes.slice(0, room).trimEnd()}…`, maxItems: order.items.length });
    }
  }

  // 2. Sin notas y con menos líneas, hasta que entre (el pedido completo está en el panel).
  for (let maxItems = order.items.length - 1; maxItems >= 1; maxItems--) {
    const message = compose(order, storeName, currency, { notes: null, maxItems });
    if (message.length <= MAX_MESSAGE_LENGTH) return message;
  }
  return compose(order, storeName, currency, { notes: null, maxItems: 1 }).slice(0, MAX_MESSAGE_LENGTH);
}

/** https://wa.me/{número sin +}?text={mensaje}. null si el comercio no cargó su WhatsApp. */
export function whatsappUrl(phone: string | null, message: string): string | null {
  const digits = phone?.replace(/\D/g, "");
  if (!digits || digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
