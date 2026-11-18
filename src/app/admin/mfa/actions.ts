"use server";

import { z } from "zod";
import { resolvePlatformAdmin } from "@/core/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * MFA con app autenticadora para el panel central (diseño, sección 6: obligatorio
 * para platform_admins). Solo para administradores con sesión de nivel aal1.
 * Al verificar, Supabase sube la sesión a aal2 (cookies nuevas en esta respuesta).
 *
 * No se usa redirect("/") desde acá: en el host admin se resolvería sin pasar por el
 * proxy (trampa 2 de CLAUDE.md). El cliente navega con `redirectTo`.
 */

export type MfaState = { error?: string; redirectTo?: string };
export type Enrollment = { factorId: string; qrCode: string; secret: string } | { error: string };

async function adminWithoutMfa() {
  const gate = await resolvePlatformAdmin();
  return gate.status === "needs-mfa" ? gate : null;
}

export async function startEnrollmentAction(): Promise<Enrollment> {
  if (!(await adminWithoutMfa())) return { error: "No tenés acceso." };
  const supabase = await createSupabaseServerClient();

  const { data: factors } = await supabase.auth.mfa.listFactors();

  // Con un factor ya verificado, no se activa otro desde una sesión aal1: si no, alguien
  // con la contraseña del admin podría registrar su propia app y saltear el MFA.
  // Para cambiar de app, un superadmin borra el factor por SQL revisado (como las altas).
  if ((factors?.all ?? []).some((f) => f.status === "verified")) {
    return { error: "Ya tenés un segundo factor activo. Ingresá con el código de tu app." };
  }

  // Un intento anterior sin terminar deja un factor sin verificar: se borra antes de empezar otro.
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Panel central ${Date.now()}` });
  if (error || !data) return { error: "No pudimos preparar el código. Probá de nuevo." };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

const verifySchema = z.object({
  factorId: z.uuid(),
  code: z.string().regex(/^\d{6}$/, "El código tiene 6 números."),
});

export async function verifyMfaAction(_prev: MfaState, formData: FormData): Promise<MfaState> {
  if (!(await adminWithoutMfa())) return { error: "No tenés acceso." };
  const parsed = verifySchema.safeParse({
    factorId: formData.get("factorId"),
    code: String(formData.get("code") ?? "").replace(/\s/g, ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá el código." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify(parsed.data);
  if (error) return { error: "Ese código no es válido o ya venció. Probá con el que muestra ahora la app." };
  return { redirectTo: "/" };
}
