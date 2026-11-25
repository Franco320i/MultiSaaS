import "server-only";
import { z } from "zod";

/**
 * Captcha de Supabase Auth (Cloudflare Turnstile, configurado en el proyecto de Supabase).
 * El formulario manda el token en `turnstileToken`; se le pasa tal cual a Supabase como
 * `captchaToken`, y es Supabase quien lo verifica. No lo verificamos nosotros antes:
 * el token es de un solo uso y Supabase lo rechazaría.
 *
 * Así no se puede registrar ni probar contraseñas llamando a Supabase directo, sin
 * pasar por nuestras páginas.
 */

const tokenSchema = z.string().min(1).max(2048);

export function captchaTokenFrom(formData: FormData): string | null {
  const parsed = tokenSchema.safeParse(formData.get("turnstileToken"));
  return parsed.success ? parsed.data : null;
}

export const CAPTCHA_ERROR = "No pudimos verificar el envío. Recargá la página y probá de nuevo.";

/** Supabase responde `captcha_failed` cuando el token falta, venció o ya se usó. */
export function isCaptchaError(error: { code?: string } | null | undefined): boolean {
  return error?.code === "captcha_failed";
}
