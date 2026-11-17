import { createHash } from "node:crypto";

/**
 * IP del cliente para límites de frecuencia. Nunca se guarda en claro: solo su hash con sal.
 * En Vercel, x-forwarded-for lo arma la propia plataforma (el primer valor es el cliente).
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip")?.trim();
  return ip && ip.length <= 64 ? ip : null;
}

export function hashIp(ip: string | null, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip ?? "desconocida"}`).digest("base64url");
}
