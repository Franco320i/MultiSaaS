#!/usr/bin/env node
// Capa 5 (diseño, sección 13): ninguna variable con SECRET, SERVICE o PRIVATE en el nombre
// lleva el prefijo NEXT_PUBLIC_. Next.js mete esas variables en el JavaScript del navegador,
// así que un nombre así casi siempre es una clave secreta publicada por error.
//
// Revisa todos los archivos versionados (código, configuración, workflows, .env.example).
// Uso: node scripts/check-env-names.mjs   → sale con código 1 si encuentra alguna.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Armado por partes para que este mismo archivo no coincida consigo mismo.
const PREFIX = ["NEXT", "PUBLIC", ""].join("_");
const FORBIDDEN = new RegExp(`\\b${PREFIX}[A-Z0-9_]*(SECRET|SERVICE|PRIVATE)[A-Z0-9_]*`, "g");

const BINARY = /\.(png|jpe?g|webp|gif|ico|svg|woff2?|ttf|pdf|zip|xlsx)$/i;

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8",
})
  .split("\n")
  .filter((file) => file && !BINARY.test(file));

const problems = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue; // archivo borrado en el árbol de trabajo
  }
  text.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(FORBIDDEN)) {
      problems.push(`${file}:${index + 1}  ${match[0]}`);
    }
  });
}

if (problems.length > 0) {
  console.error("Variables públicas con nombre de secreto (NEXT_PUBLIC_ + SECRET/SERVICE/PRIVATE):");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("Si es un secreto, sacale el prefijo NEXT_PUBLIC_ y leelo solo en el servidor.");
  process.exit(1);
}

console.log(`Variables de entorno: OK (${files.length} archivos revisados).`);
