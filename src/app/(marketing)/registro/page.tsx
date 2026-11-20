import type { Metadata } from "next";
import Link from "next/link";
import { MIN_PASSWORD_LENGTH } from "@/core/auth/register";
import { env } from "@/lib/env";
import { publicEnv } from "@/lib/env.public";
import { platformUrl } from "@/lib/urls";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Armá el catálogo de tu comercio y recibí pedidos por WhatsApp.",
};

/**
 * tuapp.com.ar/registro · Paso 1 del alta por autoservicio (diseño, sección 10):
 * solo email y contraseña. El comercio se crea después de confirmar el email.
 */
export default function RegisterPage() {
  // El login vive en el host del panel (app.).
  const loginUrl = platformUrl(env.ROOT_DOMAIN, "app", "/auth/login");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] leading-tight text-balance">Armá el catálogo de tu comercio</h1>
        <p className="text-muted">
          Creá tu cuenta gratis. Después cargás tus productos y empezás a recibir pedidos por WhatsApp. Tenés 14 días de prueba.
        </p>
      </header>
      <RegisterForm turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY} minPasswordLength={MIN_PASSWORD_LENGTH} />
      <p className="text-center text-[14px] text-muted">
        Al crear tu cuenta aceptás los{" "}
        <Link href="/terminos" className="underline underline-offset-4">
          Términos y condiciones
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className="underline underline-offset-4">
          Política de privacidad
        </Link>
        .
      </p>
      <p className="text-center text-[15px] text-muted">
        ¿Ya tenés cuenta?{" "}
        <a href={loginUrl} className="font-semibold text-foreground underline underline-offset-4">
          Ingresá
        </a>
      </p>
    </main>
  );
}
