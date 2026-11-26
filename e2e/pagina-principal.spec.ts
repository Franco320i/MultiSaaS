import { expect, test } from "@playwright/test";
import { ROOT } from "./helpers";

/** Página principal (docs/superpowers/specs/2026-11-20-pagina-principal-design.md). */

test("la página principal vende y lleva al registro", async ({ page }) => {
  await page.goto(`${ROOT}/`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dejá de mandar fotos y precios por WhatsApp");
  await expect(page.getByText("14 días gratis · Sin tarjeta · Sin comisiones por venta").first()).toBeVisible();

  // Sin scroll horizontal en el celular (Pixel 7).
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);

  // Planes leídos de la base (seed: Base $ 24.900 con 150 productos, Pro ilimitado).
  const planes = page.locator("#planes");
  await expect(planes.getByRole("heading", { name: "Base" })).toBeVisible();
  await expect(planes.getByText(/\$\s24\.900/)).toBeVisible();
  await expect(planes.getByText("Productos ilimitados")).toBeVisible();
  await expect(planes.getByText("Recomendado")).toBeVisible();

  // En el celular, "Ingresar" está en el menú y va al host del panel.
  const menuButton = page.getByRole("button", { name: "Abrir menú" });
  await menuButton.click();
  await expect(page.getByRole("link", { name: "Ingresar" }).first()).toHaveAttribute("href", /\/\/app\./);
  await page.keyboard.press("Escape");
  await expect(menuButton).toBeFocused();

  // Sin registro automático: "Pedí tu demo" abre el WhatsApp de la plataforma (SALES_WHATSAPP
  // de .env.local) con el pedido escrito, y /registro ya no existe.
  const demo = page.getByRole("link", { name: "Pedí tu demo" }).first();
  const href = new URL((await demo.getAttribute("href")) ?? "");
  expect(href.origin + href.pathname).toBe("https://wa.me/5492954000000");
  expect(href.searchParams.get("text")).toContain("quiero una demo");
  expect((await page.request.get(`${ROOT}/registro`)).status()).toBe(404);
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Términos y condiciones" })).toBeVisible();
});

test("los legales están publicados y no se indexan", async ({ page }) => {
  for (const path of ["/terminos", "/privacidad"]) {
    await page.goto(`${ROOT}${path}`);
    await expect(page.getByText(/\[PENDIENTE/).first()).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});
