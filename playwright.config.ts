import { defineConfig, devices } from "@playwright/test";

/**
 * Capa 4 del diseño (sección 13): recorridos E2E de humo con hosts *.localhost.
 *
 * Corren contra `next start` (build de producción), porque la caché del catálogo solo se
 * comporta como en producción con un build. Requieren Supabase local recién reseteado
 * (`npm run db:reset`) y `npm run build` hecho antes.
 *
 * Un solo worker: los recorridos comparten la base y uno de ellos edita un producto de Alfa.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
  },
  projects: [
    // Móvil primero: el catálogo y el carrito se diseñaron para el teléfono.
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
