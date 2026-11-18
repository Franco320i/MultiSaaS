import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Pruebas de integración (diseño, sección 13, capa 3): corren contra Supabase local
// con los datos de supabase/seed.sql. Requieren `npx supabase start` y `npm run db:reset`.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" protege que el código de servidor no llegue al navegador; en las
      // pruebas (Node) se reemplaza por su versión vacía, la misma que usa React en el servidor.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    env: loadEnv("test", process.cwd(), ""),
    testTimeout: 15_000,
    // Todos los archivos usan la misma base local y algunos cambian datos del seed
    // (por ejemplo, el alta asistida le suma un comercio al dueño de Alfa): uno por vez.
    fileParallelism: false,
  },
});
