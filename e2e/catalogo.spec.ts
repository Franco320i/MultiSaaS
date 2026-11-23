import { expect, test } from "@playwright/test";
import { catalogUrl, SEED } from "./helpers";

/** Catálogo nuevo (docs/superpowers/specs/2026-11-22-catalogo-nuevo-design.md): ficha y buscador. */

test("la ficha del producto se abre, agrega con el precio y se cierra con Atrás", async ({ page }) => {
  await page.goto(catalogUrl("alfa"));
  await page.getByRole("button", { name: `Ver ${SEED.alfaProductName}` }).first().click();

  const sheet = page.getByRole("dialog", { name: SEED.alfaProductName });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: `Agregar ${SEED.alfaProductName} al pedido` }).click();
  await expect(sheet.getByText("En tu pedido")).toBeVisible();

  // "Atrás" del celular cierra la ficha y deja al cliente en el catálogo, con el pedido armado.
  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`^${catalogUrl("alfa")}/?$`));
  await expect(page.getByRole("button", { name: /Ver pedido · 1/ })).toBeVisible();
});

test("el buscador encuentra sin acentos ni mayúsculas y avisa si no hay resultados", async ({ page }) => {
  await page.goto(catalogUrl("alfa"));
  const search = page.getByRole("searchbox", { name: "Buscar en el catálogo" });

  await search.fill(SEED.alfaProductName.toUpperCase());
  await expect(page.getByText(/^1 producto/)).toBeVisible();

  await search.fill("zzzz");
  await expect(page.getByText("No encontramos «zzzz»")).toBeVisible();
  await page.getByRole("button", { name: "Borrar la búsqueda" }).click();
  await expect(page.getByRole("heading", { name: "Destacados" })).toBeVisible();
});

test("producto con opciones: hay que elegir el tamaño, suma los extras y queda como línea propia", async ({ page }) => {
  await page.goto(catalogUrl("alfa"));
  const name = "Hamburguesa a elección";
  await page.getByRole("button", { name: `Elegir opciones de ${name}` }).click();

  const sheet = page.getByRole("dialog", { name });
  await expect(sheet.getByRole("button", { name: "Falta elegir tamaño" })).toBeDisabled();
  await expect(sheet.getByRole("button", { name: /Extras: Huevo.*agotado/ })).toBeDisabled();

  await sheet.getByRole("button", { name: /^Tamaño: Doble/ }).click();
  await sheet.getByRole("button", { name: /^Extras: Panceta/ }).click();
  await expect(sheet.getByRole("button", { name: `Agregar ${name} al pedido` })).toHaveText(/Agregar · \$\s10\.300/);
  await sheet.getByRole("button", { name: `Agregar ${name} al pedido` }).click();
  await expect(sheet.getByText("Listo, lo sumamos a tu pedido")).toBeVisible();

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Ver pedido · 1/ }).click();
  const order = page.getByRole("dialog", { name: "Tu pedido" });
  await expect(order.getByText("Doble, Panceta")).toBeVisible();
  await expect(order.getByText(/\$\s10\.300 c\/u/)).toBeVisible();
});
