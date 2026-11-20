/**
 * Regla del catálogo de ejemplo de la página principal, separada para poder probarla.
 *
 * El alta es por autoservicio: cualquiera podría registrar un comercio con el slug que
 * usamos de ejemplo. Por eso no alcanza con que el host exista: el comercio publicado
 * tiene que ser exactamente el que la plataforma configuró (DEMO_TENANT_ID).
 */
export function officialDemoUrl(
  storefront: null | { available: false } | { available: true; tenant_id: string },
  demoTenantId: string | undefined,
  url: string,
): string | null {
  if (!demoTenantId || !storefront || !storefront.available) return null;
  return storefront.tenant_id === demoTenantId ? url : null;
}
