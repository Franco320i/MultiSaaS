/**
 * Único lugar donde se arman los tags de caché (diseño, sección 12).
 * Todo tag lleva el host o el comercio adentro: nunca un tag global con datos de comercios.
 * Los tags se invalidan SIEMPRE con un tenantId obtenido en el servidor, nunca uno del navegador.
 */
export const cacheTags = {
  /** Resolución host → comercio (getStorefront). */
  host: (host: string) => `host:${host}`,
  /** Categorías, productos y fotos públicas de un comercio (getPublicCatalog). */
  tenantCatalog: (tenantId: string) => `tenant:${tenantId}:catalog`,
  /** Configuración pública y horarios de un comercio (getStorefront). */
  tenantSettings: (tenantId: string) => `tenant:${tenantId}:settings`,
  /**
   * Planes públicos de la página principal. Único tag global: los planes son datos de la
   * plataforma, no de un comercio. Se invalida solo al desplegar (los precios cambian por migración).
   */
  plans: () => "plans",
};
