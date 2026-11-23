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
  await toggle.click();
  await expect(page.getByRole("switch", { name: `${product}: sin stock` })).toBeVisible();

  try {
    await page.goto(catalogUrl("alfa"));
    await page.getByRole("searchbox", { name: "Buscar en el catálogo" }).fill(product);
    await expect(page.getByText("Sin stock").first()).toBeVisible();
    await expect(page.getByRole("button", { name: `Agregar ${product} al pedido` })).toHaveCount(0);
  } finally {
    // Deja el producto como estaba, aunque la prueba falle.
    await page.goto(`${APP}/alfa/productos`);
    await page.getByRole("switch", { name: `${product}: sin stock` }).click();
    await expect(page.getByRole("switch", { name: `${product}: hay stock` })).toBeVisible();
  }
});
