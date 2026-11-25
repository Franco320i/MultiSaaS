"use server";

import { CAPTCHA_ERROR, captchaTokenFrom } from "@/core/auth/captcha";
import { registerSchema, registerUser } from "@/core/auth/register";

/**
 * Registro (tuapp.com.ar/registro). Endpoint público: Zod + Turnstile (lo verifica
 * Supabase Auth, ver core/auth/captcha.ts) y respuesta igual exista o no el email.
 */

export type RegisterState = { error?: string; sentTo?: string; email?: string };

export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).slice(0, 254) : "";
  const parsed = registerSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos.", email };

  const captchaToken = captchaTokenFrom(formData);
  if (!captchaToken) return { error: CAPTCHA_ERROR, email };

  const result = await registerUser(parsed.data, captchaToken);
  if (!result.ok) return { error: result.error, email };
  return { sentTo: parsed.data.email };
}
