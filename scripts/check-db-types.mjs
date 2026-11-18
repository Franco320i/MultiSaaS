#!/usr/bin/env node
// Capa 5 (diseño, secciones 13 y 14, regla 7): src/types/database.ts tiene que coincidir
// con el esquema que dejan las migraciones. Si alguien cambió una migración y no corrió
// `npm run db:types`, esto falla.
//
// Requiere Supabase local levantado con las migraciones aplicadas (`npm run db:reset`).
// Uso: node scripts/check-db-types.mjs

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const FILE = "src/types/database.ts";

// Se ignoran los finales de línea (CRLF en Windows con autocrlf).
const normalize = (text) => text.replace(/\r\n/g, "\n").trimEnd();

let generated;
try {
  generated = execSync("npx supabase gen types typescript --local --schema public", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
  });
} catch (error) {
  console.error("No se pudieron generar los tipos. ¿Está levantado Supabase local (`npx supabase start`)?");
  console.error(String(error.stderr ?? error.message));
  process.exit(1);
}

const committed = readFileSync(FILE, "utf8");
if (normalize(generated) !== normalize(committed)) {
  const a = normalize(committed).split("\n");
  const b = normalize(generated).split("\n");
  const first = a.findIndex((line, index) => line !== b[index]);
  const line = first === -1 ? Math.min(a.length, b.length) + 1 : first + 1;
  console.error(`${FILE} no coincide con el esquema (primera diferencia en la línea ${line}).`);
  console.error(`  versionado: ${a[line - 1] ?? "(fin del archivo)"}`);
  console.error(`  generado:   ${b[line - 1] ?? "(fin del archivo)"}`);
  console.error("Corré `npm run db:types` y versioná el resultado.");
  process.exit(1);
}

console.log(`Tipos de la base: OK (${FILE} coincide con el esquema).`);
