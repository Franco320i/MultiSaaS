import "server-only";
import { env } from "@/lib/env";
import { platformUrl } from "@/lib/urls";
import { officialDemoUrl } from "./demo-rule";
import { normalizeHost } from "./host";
import { getStorefront } from "./storefront";

/**
 * Link al catálogo de ejemplo de la página principal. Solo si están configurados
 * DEMO_CATALOG_SLUG y DEMO_TENANT_ID y ese comercio existe, está publicado y es el
 * configurado (ver demo-rule.ts). Así nadie cae en "Catálogo no encontrado" ni se
 * anuncia un comercio ajeno. getStorefront ya está cacheada por host; si la base
 * falla, no se muestra el botón.
 */
export async function getDemoCatalogUrl(): Promise<string | null> {
  if (!env.DEMO_CATALOG_SLUG || !env.DEMO_TENANT_ID) return null;
  const host = normalizeHost(`${env.DEMO_CATALOG_SLUG}.${env.ROOT_DOMAIN}`);
  if (!host) return null;
  try {
    const storefront = await getStorefront(host);
    return officialDemoUrl(storefront, env.DEMO_TENANT_ID, platformUrl(env.ROOT_DOMAIN, env.DEMO_CATALOG_SLUG, "/"));
  } catch {
    return null;
  }
}
