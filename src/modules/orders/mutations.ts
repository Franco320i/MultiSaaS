import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { OrderStatus } from "./status";

/**
 * Cambio de estado de un pedido, con la SESIÓN del usuario: RLS solo deja tocar
 * pedidos del propio comercio y la columna status; el trigger de la base valida la
 * transición y registra order.status_changed. Sin Next.js, para poder probarlo.
 */

type Client = SupabaseClient<Database>;
export type StatusResult = { ok: true } | { ok: false; error: string };

export async function setOrderStatus(
  supabase: Client,
  tenantId: string,
  orderId: string,
  status: OrderStatus,
): Promise<StatusResult> {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("tenant_id", tenantId)
    .eq("id", orderId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.message === "order_closed") return { ok: false, error: "Este pedido ya está cerrado." };
    if (error.message === "invalid_status_transition") {
      return { ok: false, error: "El pedido ya avanzó. Recargá para ver su estado." };
    }
    return { ok: false, error: "No pudimos cambiar el estado. Probá de nuevo." };
  }
  if (!data) return { ok: false, error: "El pedido no existe." };
  return { ok: true };
}
