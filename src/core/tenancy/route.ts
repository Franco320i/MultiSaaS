import { classifyHost, normalizeHost } from "./host";

/**
 * Decisión de enrutamiento del proxy, separada de Next.js para poder probarla.
 * `src/proxy.ts` solo traduce esta decisión a un NextResponse.
 */
/**
 * `private: true` = respuesta de panel o admin: nunca se cachea y es el único caso
 * en que el proxy toca la sesión de Supabase.
 */
export type RouteDecision =
  | { action: "next"; private: boolean }
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

  const isPrivateHost = target.kind === "panel" || target.kind === "admin";

  // 3. Las rutas de API no se reescriben: cada handler resuelve el host por su cuenta.
  if (startsWithSegment(lowerPath, "/api")) return { action: "next", private: isPrivateHost };

  // 4. Login, logout y callbacks de Auth: solo en los hosts del panel y del admin,
  //    para que las cookies de sesión queden atadas a esos hosts y a ningún otro.
  if (startsWithSegment(lowerPath, "/auth")) {
    return isPrivateHost ? { action: "next", private: true } : { action: "not-found" };
  }

  // 5. Reescribir a la sección que corresponde.
  switch (target.kind) {
    case "marketing":
      return { action: "next", private: false };
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
