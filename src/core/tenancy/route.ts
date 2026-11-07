import { classifyHost, normalizeHost } from "./host";

/**
 * Decisión de enrutamiento del proxy, separada de Next.js para poder probarla.
 * `src/proxy.ts` solo traduce esta decisión a un NextResponse.
 */
export type RouteDecision =
  | { action: "next" }
  | { action: "rewrite"; pathname: string; private: boolean }
  | { action: "redirect-to-root" }
  | { action: "not-found" }
  | { action: "bad-request" };

/** Carpetas de `src/app` que solo existen por reescritura. Pedirlas directo da 404. */
const INTERNAL_PREFIXES = ["/sites", "/panel", "/admin"] as const;

function startsWithSegment(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function withPrefix(prefix: string, pathname: string): string {
  return pathname === "/" ? prefix : `${prefix}${pathname}`;
}

export function decideRoute(input: {
  rawHost: string | null;
  pathname: string;
  rootDomain: string;
}): RouteDecision {
  const { pathname, rootDomain } = input;

  // 1. Las rutas internas nunca se piden directamente, desde ningún host.
  //    Se compara la ruta decodificada, sin barras repetidas y en minúsculas, para que
  //    `/%73ites`, `//sites` o `/Sites` no esquiven el bloqueo.
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { action: "bad-request" };
  }
  const lowerPath = decoded.replace(/\/{2,}/g, "/").toLowerCase();
  if (INTERNAL_PREFIXES.some((prefix) => startsWithSegment(lowerPath, prefix))) {
    return { action: "not-found" };
  }

  // 2. Normalizar y clasificar el host.
  const host = normalizeHost(input.rawHost);
  if (!host) return { action: "bad-request" };

  const target = classifyHost(host, rootDomain);
  if (target.kind === "invalid") return { action: "not-found" };
  if (target.kind === "redirect-to-root") return { action: "redirect-to-root" };

  // 3. Las rutas de API no se reescriben: cada handler resuelve el host por su cuenta.
  if (startsWithSegment(lowerPath, "/api")) return { action: "next" };

  // 4. Reescribir a la sección que corresponde.
  switch (target.kind) {
    case "marketing":
      return { action: "next" };
    case "panel":
      return { action: "rewrite", pathname: withPrefix("/panel", pathname), private: true };
    case "admin":
      return { action: "rewrite", pathname: withPrefix("/admin", pathname), private: true };
    case "storefront":
      return {
        action: "rewrite",
        pathname: withPrefix(`/sites/${target.host}`, pathname),
        private: false,
      };
  }
}
