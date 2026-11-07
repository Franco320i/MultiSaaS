import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordResetAction } from "../actions";
import { AuthForm, Field } from "../auth-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
      <p className="text-sm opacity-80">Te enviamos un enlace para crear una contraseña nueva.</p>
      <AuthForm action={requestPasswordResetAction} submitLabel="Enviar enlace" pendingLabel="Enviando…">
        <Field label="Email" name="email" type="email" autoComplete="email" />
      </AuthForm>
      <Link href="/auth/login" className="text-sm underline opacity-80">
        Volver a ingresar
      </Link>
    </>
  );
}
