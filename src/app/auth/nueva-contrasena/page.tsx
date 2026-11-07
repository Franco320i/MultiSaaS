import type { Metadata } from "next";
import { updatePasswordAction } from "../actions";
import { AuthForm, Field } from "../auth-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

// Se llega desde el enlace del correo, ya con una sesión de recuperación.
// La acción verifica esa sesión antes de cambiar la contraseña.
export default function NewPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
      <AuthForm action={updatePasswordAction} submitLabel="Guardar contraseña" pendingLabel="Guardando…">
        <Field label="Contraseña nueva (mínimo 10 caracteres)" name="password" type="password" autoComplete="new-password" minLength={10} />
        <Field label="Repetir contraseña" name="confirm" type="password" autoComplete="new-password" minLength={10} />
      </AuthForm>
    </>
  );
}
