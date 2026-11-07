import { isValidSlug } from "./slug";

/**
 * Resolución de hosts (diseño, sección 7). Funciones puras, sin base de datos:
 * el proxy solo decide qué sección atiende cada host. Qué comercio es (y si existe)
 * lo resuelve la página del catálogo a partir del host (etapa 6).
 */

export type HostTarget =
  | { kind: "marketing" }
  | { kind: "redirect-to-root" }
  | { kind: "panel" }
  | { kind: "admin" }
  | { kind: "storefront"; host: string }
  | { kind: "invalid" };

const MAX_HOST_LENGTH = 253;
const HOST_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;

/**
 * Normaliza el header Host: minúsculas, sin puerto, sin punto final.
 * Devuelve null si no es un nombre de host válido (incluye IPv6 y caracteres raros).
 */
export function normalizeHost(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let host = raw.trim().toLowerCase();
  if (host.startsWith("[")) return null; // IPv6 literal: no lo atendemos.

  const colon = host.indexOf(":");
  if (colon !== -1) {
    const port = host.slice(colon + 1);
    if (!/^\d{1,5}$/.test(port)) return null;
    host = host.slice(0, colon);
  }

  if (host.endsWith(".")) host = host.slice(0, -1);
  if (host.length === 0 || host.length > MAX_HOST_LENGTH) return null;
  if (!HOST_PATTERN.test(host)) return null;

  return host;
}

/** Clasifica un host ya normalizado respecto del dominio raíz de la plataforma. */
export function classifyHost(host: string, rootDomain: string): HostTarget {
  if (host === rootDomain) return { kind: "marketing" };
  if (host === `www.${rootDomain}`) return { kind: "redirect-to-root" };
  if (host === `app.${rootDomain}`) return { kind: "panel" };
  if (host === `admin.${rootDomain}`) return { kind: "admin" };

  const suffix = `.${rootDomain}`;
  if (host.endsWith(suffix)) {
    const label = host.slice(0, -suffix.length);
    // Un solo nivel: `alfa.tuapp.com.ar` sí, `x.alfa.tuapp.com.ar` no.
    if (label.includes(".") || !isValidSlug(label)) return { kind: "invalid" };
    return { kind: "storefront", host };
  }

  // Cualquier otro dominio se trata como posible dominio propio de un comercio
  // (preparado en el diseño). Si no está registrado en `domains`, la página responde 404.
  return { kind: "storefront", host };
}
