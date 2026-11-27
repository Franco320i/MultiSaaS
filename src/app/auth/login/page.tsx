import type { Metadata } from "next";
import { Suspense } from "react";
import { publicEnv } from "@/lib/env.public";
import { signInAction } from "../actions";
import { Field, TurnstileAuthForm } from "../auth-form";
import { LoginLinks } from "../platform-links";
import { NextField } from "./next-field";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Ingresar</h1>
      <TurnstileAuthForm turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY} action={signInAction} submitLabel="Ingresar" pendingLabel="Ingresando…">
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Contraseña" name="password" type="password" autoComplete="current-password" />
        <Suspense>
          <NextField />
        </Suspense>
      </TurnstileAuthForm>
      <Suspense>
        <LoginLinks />
      </Suspense>
    </>
  );
}
