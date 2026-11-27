import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

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

/** Superadmin del seed (admin@example.com): el actor del alta asistida. */
const SEED_SUPERADMIN_ID = "55555555-5555-4555-8555-555555555555";

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
  await waitForTurnstile(page); // el login pide el token de Turnstile antes de enviar
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(`${APP}${next}`);
  await page.waitForLoadState("load");
}

/** Lee una variable del .env.local del repo (Playwright no lo carga solo). */
function localEnv(name: string): string {
  const line = readFileSync(join(__dirname, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  const value = line?.slice(name.length + 1).trim();
  if (!value) throw new Error(`Falta ${name} en .env.local para las pruebas E2E.`);
  return value;
}

/**
 * Hace lo mismo que la alta asistida del panel central (rediseño 11e: sin registro
 * automático): crea la cuenta del dueño, confirmada y con contraseña, y su comercio en
 * prueba. El panel central pide MFA, así que la prueba usa la API de administración local.
 */
export async function createOwnerAndTenant(input: { email: string; password: string; name: string; slug: string; whatsapp: string }) {
  // Solo contra el Supabase local: si .env.local apuntara a staging o producción, la prueba
  // crearía usuarios de verdad con su clave secreta.
  const url = localEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error(`Las pruebas E2E solo corren contra Supabase local, no contra ${new URL(url).hostname}.`);
  }
  const service = createClient(url, localEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user, error: userError } = await service.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (userError || !user.user) throw new Error(`No se pudo crear el dueño: ${userError?.message}`);
  const { error } = await service.rpc("admin_provision_tenant", {
    p_actor: SEED_SUPERADMIN_ID,
    p_owner_id: user.user.id,
    p_input: { name: input.name, slug: input.slug, business_type: "gastronomia", whatsapp_phone: input.whatsapp },
    p_root_domain: "localhost",
  });
  if (error) throw new Error(`No se pudo crear el comercio: ${error.message}`);
}
