import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PasswordHelp } from "../platform-links";

export const metadata: Metadata = { title: "Recuperar contraseña" };

// Rediseño 11e: Vidri no manda correos. La contraseña nueva de un dueño la genera la
// plataforma desde el panel central ("Nueva contraseña") y se manda por WhatsApp.
export default function RecoverPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">¿Te olvidaste la contraseña?</h1>
      <Suspense fallback={<div aria-hidden className="h-24" />}>
        <PasswordHelp />
      </Suspense>
      <Link href="/auth/login" className="text-sm underline opacity-80">
        Volver a ingresar
      </Link>
    </>
  );
}
