import type { Metadata } from "next";
import Link from "next/link";
import { updatePasswordAction } from "../actions";
import { AuthForm, Field } from "../auth-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

// Se llega desde Mi local → "Tu contraseña", con la sesión del panel (rediseño 11e: la
// plataforma pasa una contraseña inicial por WhatsApp y el dueño la cambia acá).
// La acción verifica la sesión antes de cambiar la contraseña.
export default function NewPasswordPage() {
  return (
    <>
      <Link href="/" className="w-fit text-sm opacity-80">
        <span aria-hidden>‹</span> Volver al panel
      </Link>
      <h1 className="text-2xl font-semibold">Tu contraseña</h1>
      <p className="text-sm opacity-80">Elegí una propia: la que te pasamos por WhatsApp deja de servir.</p>
      <AuthForm action={updatePasswordAction} submitLabel="Guardar contraseña" pendingLabel="Guardando…">
        <Field label="Contraseña nueva (mínimo 10 caracteres)" name="password" type="password" autoComplete="new-password" minLength={10} />
        <Field label="Repetir contraseña" name="confirm" type="password" autoComplete="new-password" minLength={10} />
      </AuthForm>
    </>
  );
}
