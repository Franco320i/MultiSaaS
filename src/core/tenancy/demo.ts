import "server-only";
import { env } from "@/lib/env";
import { platformUrl } from "@/lib/urls";
import { normalizeHost } from "./host";
import { getStorefront } from "./storefront";

/**
 * Link al catálogo de ejemplo de la página principal (`demo.{dominio}`), solo si ese
 * comercio existe y está publicado: así nadie cae en "Catálogo no encontrado".
 * getStorefront ya está cacheada por host; si la base falla, no se muestra el botón.
 */
export async function getDemoCatalogUrl(): Promise<string | null> {
  const host = normalizeHost(`demo.${env.ROOT_DOMAIN}`);
  if (!host) return null;
  try {
    const storefront = await getStorefront(host);
    if (!storefront || !storefront.available) return null;
    return platformUrl(env.ROOT_DOMAIN, "demo", "/");
  } catch {
    return null;
  }
}
