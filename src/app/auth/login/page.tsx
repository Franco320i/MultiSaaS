import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { env } from "@/lib/env";
import { publicEnv } from "@/lib/env.public";
import { platformUrl } from "@/lib/urls";
import { signInAction } from "../actions";
import { Field, TurnstileAuthForm } from "../auth-form";
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
      <Link href="/auth/recuperar" className="text-sm underline opacity-80">
        Olvidé mi contraseña
      </Link>
      <p className="text-sm opacity-80">
        ¿No tenés cuenta?{" "}
        <a href={platformUrl(env.ROOT_DOMAIN, null, "/registro")} className="underline">
          Creá tu catálogo
        </a>
      </p>
    </>
  );
}
