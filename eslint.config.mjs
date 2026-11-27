import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// -----------------------------------------------------------------------------
// Fronteras de la arquitectura (diseño, sección 2, y CLAUDE.md):
//   app → modules, core, lib, ui
//   modules → core, lib, ui (nunca otro módulo: se comunican por la tabla events)
//   core → lib (nunca modules ni app)
//   lib, ui → nada del proyecto salvo lib/ui
// La clave secreta (src/lib/supabase/service.ts) solo se puede importar desde la
// lista cerrada del diseño: SERVICE_KEY_ALLOWED. Todo otro archivo da error de lint.
// -----------------------------------------------------------------------------

/** Módulos existentes. Agregar cada módulo nuevo a esta lista. */
const MODULES = ["catalog", "orders", "settings"];

/**
 * Únicos archivos que pueden importar la clave secreta (diseño, principio 4):
 * creación de pedidos hoy; panel central, alta de comercios y cron en las etapas 8 y 9.
 */
const SERVICE_KEY_ALLOWED = [
  "src/modules/orders/create.ts", // creación de pedidos
  "src/core/tenancy/provision.ts", // publicación de comercios (el alta es del panel central)
  "src/core/admin/service.ts", // panel central y tarea diaria
];

const serviceKey = {
  name: "@/lib/supabase/service",
  message: "La clave secreta de Supabase solo se usa en la lista cerrada del diseño (panel central, pedidos, alta, cron).",
};

const noApp = { group: ["@/app", "@/app/**"], message: "Solo src/app importa rutas de src/app." };
const noModules = { group: ["@/modules", "@/modules/**"], message: "core, lib y ui no dependen de los módulos." };
const noCore = { group: ["@/core", "@/core/**"], message: "lib y ui no dependen de core." };
const noRelativeParent = {
  group: ["../../*"],
  message: "Usá el alias @/ para importar fuera de la carpeta actual (así las fronteras se pueden verificar).",
};

const restrict = (patterns, { allowServiceKey = false } = {}) => ({
  "no-restricted-imports": ["error", { paths: allowServiceKey ? [] : [serviceKey], patterns }],
});

const modulePatterns = (module) => [
  noApp,
  noRelativeParent,
  {
    group: ["@/modules/*", `!@/modules/${module}`, `!@/modules/${module}/**`],
    message: "Un módulo nunca importa a otro: se comunican por la tabla events.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["src/**/*.{ts,tsx}"], rules: restrict([noRelativeParent]) },
  ...MODULES.map((module) => ({
    files: [`src/modules/${module}/**/*.{ts,tsx}`],
    rules: restrict(modulePatterns(module)),
  })),
  { files: ["src/core/**/*.{ts,tsx}"], rules: restrict([noApp, noModules, noRelativeParent]) },
  { files: ["src/lib/**/*.{ts,tsx}", "src/ui/**/*.{ts,tsx}"], rules: restrict([noApp, noModules, noCore, noRelativeParent]) },
  // Lista cerrada de la clave secreta: mismas fronteras, pero con el import permitido.
  // Va al final para que sea la última regla que se aplica a esos archivos.
  ...SERVICE_KEY_ALLOWED.map((file) => ({
    files: [file],
    rules: restrict(
      file.startsWith("src/core/") ? [noApp, noModules, noRelativeParent] : modulePatterns(file.split("/")[2]),
      { allowServiceKey: true },
    ),
  })),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
