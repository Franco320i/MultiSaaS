import "server-only";

/**
 * Verificación de Cloudflare Turnstile en el servidor (diseño, sección 11).
 * El navegador manda un token de un solo uso; acá se valida con la clave secreta.
 * Local: claves de prueba públicas que siempre aprueban (ver .env.example).
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerifier = (token: string, ip: string | null) => Promise<boolean>;

export function createTurnstileVerifier(secret: string): TurnstileVerifier {
  return async (token, ip) => {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    try {
      const response = await fetch(VERIFY_URL, { method: "POST", body, cache: "no-store" });
      if (!response.ok) return false;
      const result = (await response.json()) as { success?: unknown };
      return result.success === true;
    } catch {
      // Si Cloudflare no responde, no se acepta el pedido (mejor un reintento que spam).
      return false;
    }
  };
}
