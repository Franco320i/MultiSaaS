import { expect, test } from "@playwright/test";
import { APP, catalogUrl, login, SEED } from "./helpers";

/**
 * Recorridos 2, 3 y 4 (diseño, sección 13, capa 4): que un comercio nunca vea lo de otro,
 * ni en el catálogo público, ni en el panel, ni a través de la caché.
 */

test("el catálogo de Alfa no muestra nada de Beta", async ({ page }) => {
  await page.goto(catalogUrl("alfa"));
  await expect(page.getByRole("heading", { name: SEED.alfaName })).toBeVisible();
  await expect(page.getByText(SEED.alfaProductName).first()).toBeVisible();

  const html = await page.content();
  expect(html).not.toContain(SEED.betaName);
  for (const product of SEED.betaProducts) expect(html).not.toContain(product);
  expect(html).not.toContain("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
});

test("el dueño de Alfa en /beta recibe la página de no encontrado, sin datos de Beta", async ({ page }) => {
  await login(page, SEED.alfaOwner, "/alfa");

  for (const path of ["/beta", "/beta/productos", "/beta/pedidos", "/beta/ajustes"]) {
    await page.goto(`${APP}${path}`);
    await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
    const html = await page.content();
    expect(html, path).not.toContain(SEED.betaName);
    for (const product of SEED.betaProducts) expect(html, path).not.toContain(product);
  }
});

test("editar un producto de Alfa cambia su catálogo y no el de Beta", async ({ page, browser }) => {
  const catalog = await browser.newPage(); // sin sesión, como un comprador
  await catalog.goto(catalogUrl("beta"));
  await expect(catalog.getByRole("heading", { name: SEED.betaName })).toBeVisible();
  const betaBefore = await catalog.locator("main").innerText();

  const newName = `${SEED.alfaProductName} E2E ${Date.now().toString(36)}`;
  const productPage = `${APP}/alfa/productos/${SEED.alfaProductId}`;

  await login(page, SEED.alfaOwner, "/alfa");
  const rename = async (name: string) => {
    await page.goto(productPage);
    await page.getByLabel("Nombre", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    // Al guardar, la acción vuelve al listado: recién ahí terminó de escribir e invalidar.
    await page.waitForURL(`${APP}/alfa/productos`);
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  };

  try {
    await rename(newName);

    // Alfa: la acción invalida su tag y el catálogo muestra el nombre nuevo.
    await catalog.goto(catalogUrl("alfa"));
    await expect(catalog.getByText(newName).first()).toBeVisible(); // destacados y su categoría

    // Beta: misma página que antes, sin rastro del cambio de Alfa.
    await catalog.goto(catalogUrl("beta"));
    await expect(catalog.getByRole("heading", { name: SEED.betaName })).toBeVisible();
    expect(await catalog.locator("main").innerText()).toBe(betaBefore);
    expect(await catalog.content()).not.toContain(newName);
  } finally {
    // Deja el seed como estaba para los demás recorridos y las corridas siguientes.
    await rename(SEED.alfaProductName);
  }
});
