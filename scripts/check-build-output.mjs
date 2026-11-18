#!/usr/bin/env node
// Capa 5 (diseño, sección 13) y pendiente de /panel en CLAUDE.md: después de `next build`,
// revisa lo que quedó fijo en el build y se sirve igual a todo el mundo.
//
//   1. Cáscaras prerenderizadas (.next/server/app/**: .html, .rsc, .meta): no pueden tener
//      datos de ningún comercio ni usuario. Se buscan los UUID, correos, nombres de comercio
//      y de productos del seed, que es lo que hay en la base cuando corre el build en CI.
//   2. JavaScript del navegador (.next/static/**): tampoco datos del seed, y ningún secreto
//      (los valores reales de las variables secretas y el prefijo sb_secret_).
//
// Uso: npm run build && node scripts/check-build-output.mjs

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const NEXT = ".next";
const SHELL_DIR = join(NEXT, "server", "app");
const STATIC_DIR = join(NEXT, "static");

if (!existsSync(SHELL_DIR) || !existsSync(STATIC_DIR)) {
  console.error("No hay build en .next. Corré `npm run build` antes.");
  process.exit(1);
}

// --- Marcas de datos del seed ------------------------------------------------
const seed = readFileSync("supabase/seed.sql", "utf8");

const markers = new Set();
for (const uuid of seed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []) {
  // El UUID todo en cero es el instance_id fijo de Supabase Auth, no un dato del seed.
  if (!/^[0-]+$/.test(uuid)) markers.add(uuid);
}
for (const email of seed.match(/[a-z0-9._-]+@example\.com/g) ?? []) markers.add(email);

// Nombres de comercio (textos con mayúscula del insert de tenants) y hosts del seed.
// Los nombres de productos y categorías no se usan: son palabras comunes ("Bebidas") que
// aparecen en ejemplos de la interfaz. Un listado filtrado igual traería UUID o el slug.
const statementOf = (table) => {
  const statement = seed.match(new RegExp(`insert into public\\.${table}\\b[\\s\\S]*?;\\s*$`, "m"));
  if (!statement) {
    console.error(`No encontré el insert de public.${table} en supabase/seed.sql: revisá este script.`);
    process.exit(1);
  }
  return statement[0];
};
for (const [, text] of statementOf("tenants").matchAll(/'([^']{5,})'/g)) {
  if (/[A-Z]/.test(text)) markers.add(text);
}
for (const [, host] of statementOf("domains").matchAll(/'([a-z0-9-]+\.localhost)'/g)) markers.add(host);

// --- Secretos -------------------------------------------------------------------
function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^["']|["']$/g, "")]),
  );
}
const envFile = { ...readEnvFile(".env"), ...readEnvFile(".env.local"), ...readEnvFile(".env.production") };
const SECRET_NAMES = ["SUPABASE_SECRET_KEY", "CRON_SECRET", "TURNSTILE_SECRET_KEY", "IP_HASH_SALT", "RESEND_API_KEY"];
const secrets = SECRET_NAMES.map((name) => [name, process.env[name] || envFile[name]]).filter(
  ([, value]) => value && value.length >= 8,
);

// --- Recorrido ------------------------------------------------------------------
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

const problems = [];
const check = (file, text, list, label) => {
  for (const marker of list) {
    if (text.includes(marker)) problems.push(`${relative(".", file)}: ${label} "${marker}"`);
  }
};

let shells = 0;
for (const file of walk(SHELL_DIR)) {
  if (!/\.(html|rsc|meta)$/.test(file)) continue;
  shells += 1;
  const text = readFileSync(file, "utf8");
  check(file, text, markers, "dato del seed en la cáscara estática");
  check(file, text, ["sb_secret_"], "clave secreta");
  for (const [name, value] of secrets) if (text.includes(value)) problems.push(`${relative(".", file)}: valor de ${name}`);
}

let bundles = 0;
for (const file of walk(STATIC_DIR)) {
  if (!/\.(js|css|html|json)$/.test(file)) continue;
  bundles += 1;
  const text = readFileSync(file, "utf8");
  check(file, text, markers, "dato del seed en el JavaScript del navegador");
  check(file, text, ["sb_secret_"], "clave secreta");
  for (const [name, value] of secrets) if (text.includes(value)) problems.push(`${relative(".", file)}: valor de ${name}`);
}

if (shells === 0) {
  console.error("No encontré cáscaras prerenderizadas en .next/server/app: ¿cambió el formato del build?");
  process.exit(1);
}

if (problems.length > 0) {
  console.error("El build tiene datos que no deberían quedar fijos:");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `Build: OK (${shells} archivos prerenderizados y ${bundles} del navegador sin datos del seed ` +
    `(${markers.size} marcas) ni secretos (${secrets.length} valores revisados)).`,
);
