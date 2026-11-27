import { headers } from "next/headers";
import Link from "next/link";
import { demoRequestUrl, passwordHelpUrl } from "@/lib/demo-request";
import { env } from "@/lib/env";

/**
 * Las pantallas de ingreso se usan en app. (dueños) y en admin. (panel central). Los
 * links al WhatsApp de ventas solo tienen sentido para los dueños: un administrador
 * recupera su acceso desde el panel de Supabase (ver docs/runbooks). Lee el host de la
 * petición: se usa dentro de <Suspense>.
 */
async function isAdminHost(): Promise<boolean> {
  const host = (await headers()).get("host") ?? "";
  return host.startsWith("admin.");
}

/** Debajo del login: "Olvidé mi contraseña" y, para dueños, "Pedí tu demo". */
export async function LoginLinks() {
  const admin = await isAdminHost();
  const demo = admin ? null : demoRequestUrl(env.SALES_WHATSAPP);
  return (
    <>
      <Link href="/auth/recuperar" className="text-sm underline opacity-80">
        Olvidé mi contraseña
      </Link>
      {demo ? (
        <p className="text-sm opacity-80">
          ¿Querés tu catálogo?{" "}
          <a href={demo} target="_blank" rel="noopener noreferrer" className="underline">
            Pedí tu demo
          </a>
        </p>
      ) : null}
    </>
  );
}

/** "Olvidé mi contraseña": dueños por WhatsApp; administradores, desde Supabase. */
export async function PasswordHelp() {
  if (await isAdminHost()) {
    return (
      <p className="opacity-80">
        Las cuentas de administración se recuperan desde el panel de Supabase del proyecto (Authentication → Users). Pedíselo a otro
        superadmin.
      </p>
    );
  }
  const whatsapp = passwordHelpUrl(env.SALES_WHATSAPP);
  return (
    <>
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
    </>
  );
}
