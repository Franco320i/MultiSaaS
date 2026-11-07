/**
 * Destinos de redirección seguros. Un parámetro `next` llega del navegador, así
 * que solo se aceptan rutas internas del mismo host: nada de `//otro.com`,
 * `https://...` ni barras invertidas (evita redirecciones abiertas).
 */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  // No volver a las páginas de Auth después de iniciar sesión.
  if (value === "/auth" || value.startsWith("/auth/")) return fallback;
  return value;
}

/** Pantallas de Auth a las que sí puede volver un enlace de correo. */
const EMAIL_LINK_AUTH_PATHS: ReadonlySet<string> = new Set(["/auth/nueva-contrasena"]);

/** Destino del callback de correo: rutas internas seguras o una pantalla de Auth permitida. */
export function safeCallbackPath(value: unknown): string {
  if (typeof value === "string" && EMAIL_LINK_AUTH_PATHS.has(value)) return value;
  return safeRedirectPath(value);
}

export function loginPath(returnTo = "/"): string {
  const next = safeRedirectPath(returnTo);
  return next === "/" ? "/auth/login" : `/auth/login?next=${encodeURIComponent(next)}`;
}
