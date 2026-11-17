"use server";

import { headers } from "next/headers";
import { registerSchema, registerUser } from "@/core/auth/register";
import { env } from "@/lib/env";
import { clientIp } from "@/lib/ip";
import { createTurnstileVerifier } from "@/lib/turnstile";

/**
 * Registro (tuapp.com.ar/registro). Endpoint público: Zod + Turnstile y respuesta
 * igual exista o no el email.
 */

export type RegisterState = { error?: string; sentTo?: string; email?: string };

export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).slice(0, 254) : "";
  const parsed = registerSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos.", email };

  const token = formData.get("turnstileToken");
  const verify = createTurnstileVerifier(env.TURNSTILE_SECRET_KEY);
  if (typeof token !== "string" || !token || !(await verify(token, clientIp(await headers())))) {
    return { error: "No pudimos verificar el envío. Recargá la página y probá de nuevo.", email };
  }

  const result = await registerUser(parsed.data);
  if (!result.ok) return { error: result.error, email };
  return { sentTo: parsed.data.email };
}
