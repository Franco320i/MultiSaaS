import { expect, test } from "@playwright/test";
import { APP, catalogUrl, createOwnerAndTenant, login, waitForTurnstile } from "./helpers";

/**
 * Recorrido 1 (diseño, sección 13, capa 4; rediseño 11e: sin registro automático):
 * alta como la del panel central → el dueño entra con la contraseña que le pasaron →
 * carga productos y publica → pedido → URL de WhatsApp correcta. Un comercio nuevo por
 * corrida (slug con la hora), sin tocar el seed.
 */
test("alta, ingreso del dueño, publicación y pedido que abre WhatsApp con el mensaje armado", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const email = `e2e-${stamp}@example.com`;
  const password = "Clave-E2E-segura-2026";
  const slug = `e2e-${stamp}`;
  const storeName = `Comercio E2E ${stamp}`;
  const productName = `Empanada E2E ${stamp}`;

  // 1. La plataforma crea al dueño (con contraseña, sin correos) y su comercio.
  await createOwnerAndTenant({ email, password, name: storeName, slug, whatsapp: "+5492954555123" });

  // 2. El dueño entra a su panel con el correo y la contraseña que le pasaron por WhatsApp.
  await login(page, email, `/${slug}`, password);

  // 3. Un producto desde el importador de planillas.
  await page.goto(`${APP}/${slug}/productos/importar`);
  await page.getByLabel("Pegá acá las celdas de tu planilla").fill(`Empanadas\t${productName}\tDe carne\t1500`);
  await page.getByRole("button", { name: "Revisar" }).click();
  await page.getByRole("button", { name: "Importar 1 producto" }).click();
  await expect(page.getByRole("status")).toContainText("Importaste 1 producto");

  // 4. Publicar desde Mi local → Link y QR.
  await page.goto(`${APP}/${slug}/ajustes?seccion=link`);
  await page.getByRole("button", { name: "Publicar mi catálogo" }).click();
  await expect(page.getByText("Tu catálogo está publicado en")).toBeVisible();
  await expect(page.getByRole("link", { name: "Descargar QR" })).toHaveAttribute("download", `qr-${slug}.png`);

  // 5. Pedido en el catálogo público (otro host, sin sesión).
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

  // 6. El link va al WhatsApp del comercio, con el pedido escrito por el servidor.
  expect(url.pathname).toBe("/5492954555123");
  const text = url.searchParams.get("text") ?? "";
  expect(text).toContain(productName);
  expect(text).toContain("Cliente E2E");
  expect(text).toMatch(/#1\b/);
  expect(text).toContain("$ 1.500");
});
