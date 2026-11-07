import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signInAction } from "../actions";
import { AuthForm, Field } from "../auth-form";
import { NextField } from "./next-field";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Ingresar</h1>
      <AuthForm action={signInAction} submitLabel="Ingresar" pendingLabel="Ingresando…">
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Contraseña" name="password" type="password" autoComplete="current-password" />
        <Suspense>
          <NextField />
        </Suspense>
      </AuthForm>
      <Link href="/auth/recuperar" className="text-sm underline opacity-80">
        Olvidé mi contraseña
      </Link>
    </>
  );
}
