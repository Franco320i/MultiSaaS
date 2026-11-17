"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setOrderStatus } from "./mutations";
import { ORDER_STATUSES } from "./status";

/**
 * Server Actions de pedidos del panel. Endpoints públicos: cada una verifica el acceso
 * con requireTenantAccess (comercio del slug, validado contra tenant_members) y valida
 * con Zod. El tenantId que se usa es el verificado, nunca uno del navegador.
 * Los pedidos no son públicos: no hay caché que invalidar.
 */

export type StatusActionState = { error?: string };

const inputSchema = z.object({ orderId: z.uuid(), status: z.enum(ORDER_STATUSES) });

export async function setOrderStatusAction(
  tenantSlug: string,
  orderId: string,
  status: string,
): Promise<StatusActionState> {
  const access = await requireTenantAccess(tenantSlug, "orders.manage");
  const parsed = inputSchema.safeParse({ orderId, status });
  if (!parsed.success) return { error: "El pedido no existe." };

  const supabase = await createSupabaseServerClient();
  const result = await setOrderStatus(supabase, access.tenantId, parsed.data.orderId, parsed.data.status);
  if (!result.ok) return { error: result.error };
  refresh();
  return {};
}
