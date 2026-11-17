/**
 * URLs públicas de la plataforma a partir de ROOT_DOMAIN (diseño, sección 7).
 * Local: http://{sub}.localhost:3000 (next dev). Staging y producción: https.
 */
export function platformUrl(rootDomain: string, subdomain: string | null, path = "/"): string {
  const host = subdomain ? `${subdomain}.${rootDomain}` : rootDomain;
  const origin = rootDomain === "localhost" ? `http://${host}:3000` : `https://${host}`;
  return `${origin}${path === "/" ? "" : path}`;
}
