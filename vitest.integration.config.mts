import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Pruebas de integración (diseño, sección 13, capa 3): corren contra Supabase local
// con los datos de supabase/seed.sql. Requieren `npx supabase start` y `npm run db:reset`.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    env: loadEnv("test", process.cwd(), ""),
    testTimeout: 15_000,
  },
});
