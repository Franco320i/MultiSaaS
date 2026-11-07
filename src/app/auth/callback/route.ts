import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeCallbackPath } from "@/core/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Vuelta desde los enlaces de correo de Supabase (confirmación, recuperación).
 * Acepta el flujo PKCE (`code`) y el de token (`token_hash` + `type`).
 * Redirige siempre a una ruta interna del mismo host.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeCallbackPath(searchParams.get("next"));
  const supabase = await createSupabaseServerClient();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  // Redirección RELATIVA: el navegador la resuelve sobre el host en el que ya está
  // (app. o admin.). No se usa request.nextUrl porque en `next dev` su host es
  // siempre localhost:3000 y sacaría al usuario del panel.
  const location = ok ? next : "/auth/login?error=enlace";
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}
