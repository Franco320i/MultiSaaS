import { z } from "zod";
import { formatCents } from "@/lib/money";

/**
 * Tarjeta de resultados del inicio del panel
 * (docs/superpowers/specs/2026-11-22-tarjeta-resultados-design.md).
 * Lee lo que devuelve public.tenant_order_stats y arma los textos. Sin Next: se prueba solo.
 */

const rawSchema = z.object({
  month: z.number().int().min(1).max(12),
  month_orders: z.number().int().min(0),
  month_total: z.number().int().min(0),
  prev_orders: z.number().int().min(0),
  prev_total: z.number().int().min(0),
  top_product: z.object({ name: z.string().min(1), units: z.number().int().min(1) }).nullable(),
  new_orders: z.number().int().min(0),
});

export type OrderStats = {
  month: number;
  monthOrders: number;
  monthTotal: number;
  prevOrders: number;
  prevTotal: number;
  topProduct: { name: string; units: number } | null;
  newOrders: number;
};

/** null si la base devolvió algo inesperado: el panel sigue sin la tarjeta. */
export function parseOrderStats(raw: unknown): OrderStats | null {
  const parsed = rawSchema.safeParse(raw);
  if (!parsed.success) return null;
  const r = parsed.data;
  return {
    month: r.month,
    monthOrders: r.month_orders,
    monthTotal: r.month_total,
    prevOrders: r.prev_orders,
    prevTotal: r.prev_total,
    topProduct: r.top_product,
    newOrders: r.new_orders,
  };
}

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export type OrderStatsText = {
  monthLabel: string;
  ordersLabel: string;
  amountLabel: string;
  /** null si el mes anterior no tuvo pedidos en el mismo período. */
  change: { direction: "up" | "down" | "same"; text: string } | null;
  top: string | null;
  empty: boolean;
  emptyText: string;
};

export function describeOrderStats(stats: OrderStats, currency = "ARS"): OrderStatsText {
  const month = MONTHS[stats.month - 1];
  const prevMonth = MONTHS[(stats.month + 10) % 12];
  const since = `en el mismo período de ${prevMonth}`;

  let change: OrderStatsText["change"] = null;
  if (stats.prevOrders > 0 && stats.prevTotal > 0) {
    const pct = Math.round(((stats.monthTotal - stats.prevTotal) / stats.prevTotal) * 100);
    if (pct > 0) change = { direction: "up", text: `+${pct}% que ${since}` };
    else if (pct < 0) change = { direction: "down", text: `−${Math.abs(pct)}% que ${since}` };
    else change = { direction: "same", text: `Igual que ${since}` };
  }

  const empty = stats.monthOrders === 0;
  return {
    monthLabel: month.charAt(0).toUpperCase() + month.slice(1),
    ordersLabel: `${stats.monthOrders} ${stats.monthOrders === 1 ? "pedido" : "pedidos"}`,
    amountLabel: formatCents(stats.monthTotal, currency),
    change,
    top: !empty && stats.topProduct ? `El más pedido: ${stats.topProduct.name}` : null,
    empty,
    emptyText: `Todavía no recibiste pedidos en ${month}. Compartí el link de tu catálogo para recibir el primero.`,
  };
}
