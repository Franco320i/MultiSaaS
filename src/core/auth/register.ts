import "server-only";
import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { CAPTCHA_ERROR, isCaptchaError } from "./captcha";

/**
 * Registro por autoservicio (diseño, sección 10, paso 1): solo email y contraseña.
 * Supabase manda el correo de confirmación (plantilla supabase/templates/confirmation.html)
 * con un enlace a app.{dominio}/auth/callback que crea la sesión y lleva al asistente.
 *
 * Se usa el cliente público sin cookies: el registro ocurre en el dominio principal,
 * que nunca guarda sesiones (solo app. y admin. las tienen).
 * Nada se guarda en user_metadata: los datos del comercio se piden después de confirmar.
 * `captchaToken`: el token de Turnstile del formulario; lo verifica Supabase (ver captcha.ts).
 */

export const MIN_PASSWORD_LENGTH = 10;

export const registerSchema = z.object({
  email: z
    .email("Escribí un email válido.")
    .max(254)
    .transform((email) => email.trim().toLowerCase()),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
    .max(200),
});

export type RegisterResult = { ok: true } | { ok: false; error: string };

export async function registerUser(
  input: z.infer<typeof registerSchema>,
  captchaToken: string,
): Promise<RegisterResult> {
  const supabase = createSupabasePublicClient();
  const { error } = await supabase.auth.signUp({ email: input.email, password: input.password, options: { captchaToken } });

  if (error) {
    if (isCaptchaError(error)) return { ok: false, error: CAPTCHA_ERROR };
    if (error.code === "weak_password") {
      return { ok: false, error: "Esa contraseña es muy fácil de adivinar o apareció en filtraciones. Elegí otra." };
    }
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { ok: false, error: "Hubo muchos intentos seguidos. Esperá unos minutos y probá de nuevo." };
    }
    console.error("signUp falló", { code: error.code, status: error.status });
    return { ok: false, error: "No pudimos crear la cuenta. Probá de nuevo en unos minutos." };
  }
  // Si el email ya tenía cuenta, Supabase responde igual (no revela que existe).
  return { ok: true };
}
