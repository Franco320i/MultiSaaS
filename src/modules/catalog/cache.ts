import "server-only";
import { updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";

/**
 * Invalidación del catálogo público (diseño, sección 12, regla 7).
 * Se llama desde las Server Actions DESPUÉS de que la escritura terminó bien, con el
 * tenantId que devolvió requireTenantAccess (nunca uno del navegador).
 * `updateTag`: la próxima visita espera los datos nuevos (el dueño ve su cambio enseguida).
 */
export function revalidatePublicCatalog(tenantId: string): void {
  updateTag(cacheTags.tenantCatalog(tenantId));
}
