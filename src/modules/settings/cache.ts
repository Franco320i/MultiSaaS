import "server-only";
import { updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";

/**
 * Invalidación del catálogo público al cambiar la configuración del comercio
 * (diseño, sección 12, regla 7: después de escribir y con el tenantId del servidor).
 *
 * - Configuración, horarios, marca: tag tenant:{id}:settings (lo lleva getStorefront).
 * - Publicar o despublicar: además los tags host:{host}, porque la respuesta cacheada de
 *   un comercio "no disponible" no lleva el tag del comercio (no revela su id).
 */
export function revalidateStorefrontSettings(tenantId: string): void {
  updateTag(cacheTags.tenantSettings(tenantId));
}

export function revalidateStorefrontHosts(tenantId: string, hosts: string[]): void {
  updateTag(cacheTags.tenantSettings(tenantId));
  for (const host of hosts) updateTag(cacheTags.host(host));
}
