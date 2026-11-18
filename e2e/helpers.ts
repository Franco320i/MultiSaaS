import { expect, type Page } from "@playwright/test";

/** Hosts locales (diseño, sección 7). Chromium resuelve *.localhost sin tocar el archivo hosts. */
export const ROOT = "http://localhost:3000";
export const APP = "http://app.localhost:3000";
export const catalogUrl = (slug: string) => `http://${slug}.localhost:3000`;

/** Contraseña local de todos los usuarios del seed (ver encabezado de supabase/seed.sql). */
export const SEED_PASSWORD = "Prueba-Local-2026";

export const SEED = {
  alfaOwner: "dueno.alfa@example.com",
  alfaProductId: "a2000000-0000-4000-8000-000000000001",
  alfaProductName: "Hamburguesa doble",
  alfaName: "Burger Alfa",
  betaName: "Ropa Beta",
  betaProducts: ["Remera negra", "Gorra"],
} as const;

const MAILPIT = "http://127.0.0.1:54324";

/**
 * Espera a que la página esté lista para enviar un formulario con Turnstile: React
 * conectado y el script de Cloudflare cargado (en local, con las claves de prueba).
 */
export async function waitForTurnstile(page: Page) {
  await page.waitForFunction(() => "turnstile" in window, undefined, { timeout: 20_000 });
}

/**
 * Inicia sesión en el panel y espera a llegar a `next`. Con un destino exacto no queda
 * ninguna navegación del login a medio camino que corte el `goto` siguiente.
 */
export async function login(page: Page, email: string, next: string, password = SEED_PASSWORD) {
  await page.goto(`${APP}/auth/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(`${APP}${next}`);
  await page.waitForLoadState("load");
}

/**
 * Busca en Mailpit (Supabase local) el correo de confirmación y devuelve el enlace
 * a /auth/callback. Reintenta unos segundos porque el correo tarda en llegar.
 */
export async function confirmationLink(email: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
        if (!search.ok) return undefined;
        const { messages } = (await search.json()) as { messages: { ID: string }[] };
        if (!messages?.length) return undefined;
        const message = await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`);
        const { HTML } = (await message.json()) as { HTML: string };
        const href = HTML.match(/href="([^"]*\/auth\/callback[^"]*)"/)?.[1];
        link = href?.replaceAll("&amp;", "&");
        return link;
      },
      { message: `no llegó el correo de confirmación a ${email}`, timeout: 20_000 },
    )
    .toBeTruthy();
  return link!;
}
