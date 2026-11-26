import { expect, test } from "@playwright/test";
import { APP, catalogUrl, login, SEED } from "./helpers";

/** Panel fácil (docs/superpowers/specs/2026-11-23-panel-facil-design.md): menú y stock en un toque. */

test("el dueño apaga el stock desde la lista y el catálogo lo muestra sin stock", async ({ page }) => {
  await login(page, SEED.alfaOwner, "/alfa");

  // Menú de abajo: Productos.
  await page.getByRole("navigation", { name: "Menú del panel" }).getByRole("link", { name: "Productos" }).click();
  await expect(page).toHaveURL(`${APP}/alfa/productos`);

  const product = "Hamburguesa simple";
  const toggle = page.getByRole("switch", { name: `${product}: hay stock` });
  // El interruptor cambia al instante; se espera a que el servidor confirme antes de irse.
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/alfa/productos"));
  await toggle.click();
  await saved;
  await expect(page.getByRole("switch", { name: `${product}: sin stock` })).toBeVisible();

  try {
    await page.goto(catalogUrl("alfa"));
    await page.getByRole("searchbox", { name: "Buscar en el catálogo" }).fill(product);
    await expect(page.getByText("Sin stock").first()).toBeVisible();
    await expect(page.getByRole("button", { name: `Agregar ${product} al pedido` })).toHaveCount(0);
  } finally {
    // Deja el producto como estaba, aunque la prueba falle.
    await page.goto(`${APP}/alfa/productos`);
    const restored = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/alfa/productos"));
    await page.getByRole("switch", { name: `${product}: sin stock` }).click();
    await restored;
    await expect(page.getByRole("switch", { name: `${product}: hay stock` })).toBeVisible();
  }
});

test("el dueño cambia un precio desde la hoja sin perder el filtro, y Atrás la cierra", async ({ page }) => {
  await login(page, SEED.alfaOwner, "/alfa");
  const list = `${APP}/alfa/productos?ver=sin-stock`;
  await page.goto(list);
  const product = "Gaseosa 500 ml";
  const sheet = page.getByRole("dialog", { name: product });

  // Atrás cierra la hoja y deja la lista como estaba.
  await page.getByRole("button", { name: `Editar ${product}` }).click();
  await expect(sheet).toBeVisible();
  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(list);

  const setPrice = async (price: string) => {
    await page.getByRole("button", { name: `Editar ${product}` }).click();
    await sheet.getByLabel("Precio ($)").fill(price);
    await sheet.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Se guardó")).toBeVisible();
    await expect(sheet).toBeHidden();
  };

  try {
    await setPrice("2.300");
    await expect(page).toHaveURL(list);
    await expect(page.getByRole("button", { name: `Editar ${product}` })).toContainText(/2\.300/);
  } finally {
    // Deja el producto como estaba, aunque la prueba falle.
    await page.goto(list);
    await setPrice("2.000");
  }
});

test("guardar un producto que sale del filtro avisa y Atrás vuelve a la pantalla anterior", async ({ page }) => {
  await login(page, SEED.alfaOwner, "/alfa");
  const list = `${APP}/alfa/productos?ver=sin-stock`;
  await page.goto(list);
  const product = "Gaseosa 500 ml";

  try {
    // Con stock, deja de estar en "Sin stock": la hoja igual avisa y se cierra.
    await page.getByRole("button", { name: `Editar ${product}` }).click();
    const sheet = page.getByRole("dialog", { name: product });
    await sheet.getByRole("switch", { name: "Hay stock" }).check();
    await sheet.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Se guardó")).toBeVisible();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("button", { name: `Editar ${product}` })).toHaveCount(0);

    // La hoja no deja una marca de más en el historial: un Atrás sale de la lista.
    await page.goBack();
    await expect(page).toHaveURL(`${APP}/alfa`);
  } finally {
    // Deja el producto sin stock, como en el seed.
    await page.goto(`${APP}/alfa/productos`);
    const restored = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/alfa/productos"));
    await page.getByRole("switch", { name: `${product}: hay stock` }).click();
    await restored;
    await expect(page.getByRole("switch", { name: `${product}: sin stock` })).toBeVisible();
  }
});
