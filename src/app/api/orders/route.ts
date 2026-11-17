import { classifyHost, normalizeHost } from "@/core/tenancy/host";
import { getStorefront } from "@/core/tenancy/storefront";
import { env } from "@/lib/env";
import { clientIp } from "@/lib/ip";
import { createTurnstileVerifier } from "@/lib/turnstile";
import { createOrder, submitOrder, withinRateLimits } from "@/modules/orders/server";

/**
 * POST /api/orders · solo en el host de un catálogo (diseño, sección 11).
 * El comercio sale del header Host (el proxy no reescribe /api). El cuerpo trae solo
 * IDs, cantidades y datos del cliente; nunca precios ni comercio.
 */

const MAX_BODY_BYTES = 16 * 1024;

const json = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const host = normalizeHost(request.headers.get("host"));
  const target = host ? classifyHost(host, env.ROOT_DOMAIN) : null;
  if (target?.kind !== "storefront") return json(404, { error: "No encontrado." });

  const storefront = await getStorefront(target.host);
  if (!storefront || !storefront.available) {
    return json(404, { error: "Este catálogo no está disponible." });
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json(400, { error: "El pedido es demasiado grande." });
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return json(400, { error: "Revisá los datos del pedido." });
  }

  const result = await submitOrder(storefront, payload, clientIp(request.headers), {
    verifyTurnstile: createTurnstileVerifier(env.TURNSTILE_SECRET_KEY),
    ipSalt: env.IP_HASH_SALT,
    withinRateLimits,
    createOrder,
  });
  return json(result.status, result.body);
}
