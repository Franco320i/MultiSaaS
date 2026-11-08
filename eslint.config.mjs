import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// -----------------------------------------------------------------------------
// Fronteras de la arquitectura (diseño, sección 2, y CLAUDE.md):
//   app → modules, core, lib, ui
//   modules → core, lib, ui (nunca otro módulo: se comunican por la tabla events)
//   core → lib (nunca modules ni app)
//   lib, ui → nada del proyecto salvo lib/ui
// La clave secreta (src/lib/supabase/service.ts, etapas 7-9) solo se podrá importar
// desde la lista cerrada del diseño: al crear ese archivo, agregar acá un bloque
// que permita el import solo en esos archivos.
// -----------------------------------------------------------------------------

/** Módulos existentes. Agregar cada módulo nuevo a esta lista. */
const MODULES = ["catalog"];

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

const restrict = (patterns) => ({
  "no-restricted-imports": ["error", { paths: [serviceKey], patterns }],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["src/**/*.{ts,tsx}"], rules: restrict([noRelativeParent]) },
  ...MODULES.map((module) => ({
    files: [`src/modules/${module}/**/*.{ts,tsx}`],
    rules: restrict([
      noApp,
      noRelativeParent,
      {
        group: ["@/modules/*", `!@/modules/${module}`, `!@/modules/${module}/**`],
        message: "Un módulo nunca importa a otro: se comunican por la tabla events.",
      },
    ]),
  })),
  { files: ["src/core/**/*.{ts,tsx}"], rules: restrict([noApp, noModules, noRelativeParent]) },
  { files: ["src/lib/**/*.{ts,tsx}", "src/ui/**/*.{ts,tsx}"], rules: restrict([noApp, noModules, noCore, noRelativeParent]) },
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
