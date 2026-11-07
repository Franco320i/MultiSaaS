import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireUser } from "@/core/auth/session";
import type { Permission } from "@/core/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveTenantAccess, type TenantAccess } from "./access";

/**
 * Puerta de entrada de TODA página, Server Action y Route Handler del panel
 * (diseño, sección 6, y regla 1 de CLAUDE.md). Las Server Actions son endpoints
 * públicos: esta llamada va DENTRO de cada acción, no solo en el layout.
 *
 * - Sin sesión → login (vuelve al comercio después).
 * - No es miembro, o no existe → 404 (no confirma que el comercio exista).
 * - Es miembro sin el permiso → 404 por ahora (no se revela qué pantallas existen).
 *
 * Devuelve el tenantId verificado: las consultas filtran por él y RLS vuelve a filtrar.
 */
export const requireTenantAccess = cache(
  async (slug: string, permission: Permission): Promise<TenantAccess> => {
    const user = await requireUser(`/${slug}`);
    const supabase = await createSupabaseServerClient();
    const result = await resolveTenantAccess(supabase, user.id, slug, permission);

    if (!result.ok) notFound();
    return result.access;
  },
);
