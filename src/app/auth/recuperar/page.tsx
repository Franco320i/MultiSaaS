import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/env";
import { passwordHelpUrl } from "@/lib/demo-request";

export const metadata: Metadata = { title: "Recuperar contraseña" };

// Rediseño 11e: Vidri no manda correos. La contraseña nueva la genera la plataforma desde el
// panel central ("Nueva contraseña") y se manda por WhatsApp.
export default function RecoverPasswordPage() {
  const whatsapp = passwordHelpUrl(env.SALES_WHATSAPP);
  return (
    <>
      <h1 className="text-2xl font-semibold">¿Te olvidaste la contraseña?</h1>
      <p className="opacity-80">Escribinos por WhatsApp y te generamos una nueva. Cuando entres, cambiala desde Mi local.</p>
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center rounded-md bg-foreground px-4 font-semibold text-background"
        >
          Escribir por WhatsApp
        </a>
      ) : null}
      <Link href="/auth/login" className="text-sm underline opacity-80">
        Volver a ingresar
      </Link>
    </>
  );
}
