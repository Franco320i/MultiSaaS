"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { CAPTCHA_ERROR, captchaTokenFrom, isCaptchaError } from "@/core/auth/captcha";
import { safeRedirectPath } from "@/core/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Acciones de Auth. Son endpoints públicos: validan todo con Zod y responden
 * mensajes genéricos (no revelan si un email existe).
 */

/**
 * `redirectTo`: destino tras un login o un cambio de contraseña. El formulario hace
 * una navegación completa del navegador en lugar de usar redirect() de Next: en el
 * host del panel, redirect("/") desde una Server Action se resuelve internamente
 * SIN pasar por el proxy y mostraría la landing. La navegación completa además
 * descarta páginas guardadas en el navegador de la sesión anterior.
 */
export type AuthFormState = { error?: string; message?: string; redirectTo?: string };

const MIN_PASSWORD_LENGTH = 10;

const emailSchema = z.email().max(254).transform((email) => email.trim().toLowerCase());

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: "Revisá el email y la contraseña." };
  const captchaToken = captchaTokenFrom(formData);
  if (!captchaToken) return { error: CAPTCHA_ERROR };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { captchaToken },
  });
  if (error) {
    if (isCaptchaError(error)) return { error: CAPTCHA_ERROR };
    return error.code === "email_not_confirmed"
      ? { error: "Todavía no confirmaste tu email. Revisá tu correo." }
      : { error: "Email o contraseña incorrectos." };
  }

  return { redirectTo: safeRedirectPath(parsed.data.next) };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

const newPasswordSchema = z
  .object({
    password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, { path: ["confirm"] });

export async function updatePasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres y coincidir en los dos campos.` };
  }

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { error: "El enlace venció. Pedí uno nuevo." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { error: "Es la misma contraseña que tenías. Elegí una distinta." };
    }
    return error.code === "weak_password"
      ? { error: "Esa contraseña es demasiado débil o apareció en filtraciones. Probá con otra." }
      : { error: "No pudimos cambiar la contraseña. Pedí un enlace nuevo." };
  }

  return { redirectTo: "/" };
}
