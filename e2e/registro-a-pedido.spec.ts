import { expect, test } from "@playwright/test";
import { APP, catalogUrl, confirmationLink, ROOT, waitForTurnstile } from "./helpers";

/**
 * Recorrido 1 (diseño, sección 13, capa 4): registro → publicación → pedido → URL de
 * WhatsApp correcta. Un comercio nuevo por corrida (slug con la hora), sin tocar el seed.
 */
test("registro, alta, publicación y pedido que abre WhatsApp con el mensaje armado", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const email = `e2e-${stamp}@example.com`;
  const slug = `e2e-${stamp}`;
  const storeName = `Comercio E2E ${stamp}`;
  const productName = `Empanada E2E ${stamp}`;
  const whatsapp = "+54 9 2954 555123";

  // 1. Registro en el dominio principal (Turnstile con claves de prueba).
  await page.goto(`${ROOT}/registro`);
  await waitForTurnstile(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Clave-E2E-segura-2026");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page.getByText("Revisá tu correo")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // 2. Confirmación desde el correo (Mailpit) → sesión en app. y asistente.
  await page.goto(await confirmationLink(email));
  await page.waitForURL(`${APP}/nuevo`);

  // 3. Paso 1 del alta: nombre, dirección, rubro y WhatsApp.
  await page.getByLabel("Nombre del comercio").fill(storeName);
  await page.getByLabel("Dirección de tu catálogo").fill(slug);
  await expect(page.getByText("Está libre.")).toBeVisible();
  await page.getByLabel("WhatsApp del comercio").fill(whatsapp);
  await page.getByRole("button", { name: "Crear mi comercio" }).click();
  await page.waitForURL(new RegExp(`/${slug}/configurar`));

  // 4. Un producto desde el importador de planillas.
  await page.goto(`${APP}/${slug}/productos/importar`);
  await page.getByLabel("Pegá acá las celdas de tu planilla").fill(`Empanadas\t${productName}\tDe carne\t1500`);
  await page.getByRole("button", { name: "Revisar" }).click();
  await page.getByRole("button", { name: "Importar 1 producto" }).click();
  await expect(page.getByRole("status")).toContainText("Importaste 1 producto");

  // 5. Publicar.
  await page.goto(`${APP}/${slug}/configurar?paso=publicar`);
  await page.getByRole("button", { name: "Publicar mi catálogo" }).click();
  await expect(page.getByText("Tu catálogo está publicado en")).toBeVisible();

  // 6. Pedido en el catálogo público (otro host, sin sesión).
  await page.goto(catalogUrl(slug));
  await expect(page.getByRole("heading", { name: storeName })).toBeVisible();
  await page.getByRole("button", { name: `Agregar ${productName} al pedido` }).click();
  await page.getByRole("button", { name: /Ver pedido · 1/ }).click();

  const dialog = page.getByRole("dialog");
  await waitForTurnstile(page);
  await dialog.getByLabel("Tu nombre").fill("Cliente E2E");
  await dialog.getByLabel("Teléfono").fill("2954 123456");

  // La página navega a wa.me: se intercepta para leer la URL sin salir a internet.
  await page.route("https://wa.me/**", (route) => route.fulfill({ status: 200, body: "wa.me" }));
  const whatsappRequest = page.waitForRequest(/^https:\/\/wa\.me\//);
  await dialog.getByRole("button", { name: "Enviar pedido por WhatsApp" }).click();
  const url = new URL((await whatsappRequest).url());

  // 7. El link va al WhatsApp del comercio, con el pedido escrito por el servidor.
  expect(url.pathname).toBe("/5492954555123");
  const text = url.searchParams.get("text") ?? "";
  expect(text).toContain(productName);
  expect(text).toContain("Cliente E2E");
  expect(text).toMatch(/#1\b/);
  expect(text).toContain("$ 1.500");
});
