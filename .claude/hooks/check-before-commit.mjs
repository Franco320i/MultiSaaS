#!/usr/bin/env node
/**
 * Hook PreToolUse de Claude Code (configurado en .claude/settings.json).
 *
 * Antes de que Claude ejecute un `git commit` (desde Bash o PowerShell), corre
 * `npm run check` (tipos + lint + pruebas unitarias). Si falla, bloquea el commit
 * (código de salida 2) y le devuelve a Claude el motivo para que lo corrija.
 * Cualquier otro comando pasa sin demora.
 *
 * Solo afecta a los commits que hace Claude; los que hagas vos a mano no pasan por acá.
 */
import { spawnSync } from "node:child_process";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let command = "";
try {
  command = JSON.parse(raw)?.tool_input?.command ?? "";
} catch {
  process.exit(0); // entrada inesperada: no bloquear por un error del propio hook
}

// `git commit` en cualquier parte del comando (también en cadenas con && o ;).
if (!/\bgit\b(?:\s+-\S+(?:\s+\S+)?)*\s+commit\b/.test(command)) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const result = spawnSync("npm run check", {
  cwd: projectDir,
  shell: true,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

if (result.status === 0) process.exit(0);

const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim().split("\n").slice(-40).join("\n");
process.stderr.write(
  `Commit bloqueado: "npm run check" falló (tipos, lint o pruebas unitarias).\n` +
    `Corregí el problema y volvé a intentar el commit. No saltees este control.\n\n${output}\n`,
);
process.exit(2);
