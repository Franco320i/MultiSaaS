/**
 * Reglas del slug de un comercio (diseño, secciones 3 y 7).
 * El slug es el subdominio: `[slug].tuapp.com.ar`.
 *
 * La fuente de verdad será la base (CHECK + tabla `reserved_slugs`, etapa 2).
 * Esta copia sirve para descartar hosts imposibles en el proxy sin consultar la base,
 * y más adelante para validar el formulario de registro.
 */

/** 3 a 40 caracteres: minúsculas, dígitos y guiones, sin guion al principio ni al final. */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** Subdominios que nunca pueden ser de un comercio. Mantener igual a `reserved_slugs`. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "www",
  "app",
  "admin",
  "api",
  "mail",
  "staging",
  "static",
  "cdn",
  "ayuda",
  "soporte",
  "blog",
  "status",
  "docs",
  // Ruta del asistente de alta en el panel (app.{dominio}/nuevo).
  "nuevo",
]);

export function isValidSlug(slug: string): boolean {
  return (
    SLUG_PATTERN.test(slug) &&
    // Punycode (xn--): evita nombres engañosos con caracteres internacionales.
    !slug.startsWith("xn--") &&
    !RESERVED_SLUGS.has(slug)
  );
}
