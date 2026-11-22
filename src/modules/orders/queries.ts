import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { CLOSED_STATUSES, OPEN_STATUSES, type OrderStatus } from "./status";
import { parseOrderStats, type OrderStats } from "./stats";

/**
 * Lecturas de pedidos para el panel, con la SESIÓN del usuario (RLS actúa).
 * Siempre reciben el tenantId verificado por requireTenantAccess y filtran por él.
 * Nada de esto se cachea (datos personales del cliente, solo para miembros).
 */

type Client = SupabaseClient<Database>;

export type OrderListItem = {
  id: string;
  number: number;
  status: OrderStatus;
  fulfillment: "pickup" | "delivery";
  customerName: string;
  total: number;
  itemCount: number;
  createdAt: string;
};

export type OrderDetail = OrderListItem & {
  customerPhone: string;
  deliveryAddress: string | null;
  notes: string | null;
  subtotal: number;
  deliveryFee: number;
  statusChangedAt: string;
  items: { id: string; productName: string; unitPrice: number; quantity: number; lineTotal: number }[];
};

const LIST_COLUMNS = "id, number, status, fulfillment, customer_name, total, created_at, order_items(quantity)";

type Row = {
  id: string;
  number: number;
  status: string;
  fulfillment: string;
  customer_name: string;
  total: number;
  created_at: string;
  order_items: { quantity: number }[];
};

function toListItem(row: Row): OrderListItem {
  return {
    id: row.id,
    number: row.number,
    status: row.status as OrderStatus,
    fulfillment: row.fulfillment as "pickup" | "delivery",
    customerName: row.customer_name,
    total: row.total,
    itemCount: row.order_items.reduce((sum, i) => sum + i.quantity, 0),
    createdAt: row.created_at,
  };
}

/** "open": nuevos y en curso (los más viejos primero, para atenderlos en orden). "closed": los últimos 50 terminados. */
export async function listOrders(supabase: Client, tenantId: string, view: "open" | "closed"): Promise<OrderListItem[]> {
  const query = supabase
    .from("orders")
    .select(LIST_COLUMNS)
    .eq("tenant_id", tenantId)
    .in("status", view === "open" ? OPEN_STATUSES : CLOSED_STATUSES)
    .order("created_at", { ascending: view === "open" })
    .limit(view === "open" ? 200 : 50);

  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron leer los pedidos: ${error.message}`);
  return (data as Row[]).map(toListItem);
}

export async function getOrder(supabase: Client, tenantId: string, id: string): Promise<OrderDetail | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, number, status, fulfillment, customer_name, customer_phone, delivery_address, notes, subtotal, delivery_fee, total, created_at, status_changed_at, order_items(id, product_name, unit_price, quantity, line_total, position)",
    )
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .order("position", { referencedTable: "order_items" })
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer el pedido: ${error.message}`);
  if (!data) return null;

  return {
    ...toListItem({ ...data, order_items: data.order_items }),
    customerPhone: data.customer_phone,
    deliveryAddress: data.delivery_address,
    notes: data.notes,
    subtotal: data.subtotal,
    deliveryFee: data.delivery_fee,
    statusChangedAt: data.status_changed_at,
    items: data.order_items.map((i) => ({
      id: i.id,
      productName: i.product_name,
      unitPrice: i.unit_price,
      quantity: i.quantity,
      lineTotal: i.line_total,
    })),
  };
}

/** Zona horaria del comercio, para mostrar las horas como las ve el local. */
export async function getTenantTimeZone(supabase: Client, tenantId: string): Promise<string> {
  const { data } = await supabase.from("tenant_settings").select("timezone").eq("tenant_id", tenantId).maybeSingle();
  return data?.timezone ?? "America/Argentina/Buenos_Aires";
}

/**
 * Números del mes para la tarjeta del inicio (public.tenant_order_stats, SECURITY INVOKER:
 * RLS deja ver solo los comercios del usuario). null si falla: el inicio sigue sin la tarjeta.
 */
export async function getOrderStats(supabase: Client, tenantId: string): Promise<OrderStats | null> {
  const { data, error } = await supabase.rpc("tenant_order_stats", { p_tenant_id: tenantId });
  if (error) return null;
  return parseOrderStats(data);
}
