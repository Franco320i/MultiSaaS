---
name: cerrar-etapa
description: Verificación completa y cierre de una etapa del proyecto (base desde cero, pgTAP, linter, advisors, pruebas de integración y unitarias, build, revisión en el navegador, CLAUDE.md y commit). Usala cuando el usuario diga "cerrá la etapa", "commiteemos", "terminamos esta etapa", "pasemos a la siguiente", o antes de cualquier commit que cierre trabajo de una etapa, aunque no lo pida con estas palabras.
---

# Cerrar una etapa

Una etapa termina cuando lo construido se puede verificar y **todas** las pruebas pasan desde una base limpia. Este procedimiento evita cerrar con algo roto o con pasos salteados. Seguilo en orden y no avances si un paso falla: primero se corrige.

## 1. Avisar antes de recrear la base

`npm run db:reset` borra todo lo que el usuario haya cargado a mano en la base local y vuelve a los datos del seed. Si en la sesión el usuario estuvo probando en el navegador, avisale en una línea antes de correrlo.

## 2. Base de datos

```bash
npm run db:reset
npm run db:test
npm run db:lint
npm run db:advisors
npm run db:types
```

- `db:test` debe terminar en `Result: PASS`.
- `db:lint` en "No schema errors found" y `db:advisors` en "No issues found".
- Si `db:types` cambió `src/types/database.ts`, ese cambio va en el commit.

Requiere Docker Desktop abierto y `npx supabase start`. Si Supabase no responde, decíselo al usuario en lugar de saltear estos pasos.

## 3. Código

```bash
npm run test:integration
npm run check
npm run build
```

- `check` = tipos + lint + pruebas unitarias.
- En la salida de `build`, las rutas de `/panel` y `/admin` deben salir como `◐` o `ƒ`, nunca como `○` con datos de comercio en la parte estática.

## 4. Revisión en el navegador

Si la etapa cambió algo visible, recorré en el navegador integrado los flujos principales de la etapa (incluido al menos un intento de entrar a datos de otro comercio, que debe dar 404) y revisá los logs del servidor (`preview_logs` con nivel `error`). Si el panel del navegador está oculto, pedile al usuario que lo muestre: el contenido que llega en partes no se dibuja con el panel oculto.

## 5. Revisión de aislamiento

Si la etapa agregó tablas, Server Actions, Route Handlers, cachés o usos de la clave secreta, corré la skill `auditoria-aislamiento` sobre los cambios de la etapa antes del commit.

## 6. CLAUDE.md

- En la tabla de etapas: la actual pasa a **Hecha** y la siguiente a **Siguiente**.
- Agregá a "Pendientes conocidos" lo que quedó sin hacer o sin verificar, y quitá lo que se resolvió.
- Si apareció una trampa nueva (de Next.js, Supabase, Windows), documentala en la sección que corresponde.

## 7. Commit

- Revisá `git status` y que no entren archivos que no deben (`.env.local`, claves, carpetas generadas).
- Mensaje en castellano: primera línea `Etapa N: <qué se hizo>`, después una lista corta de lo importante y la cantidad de pruebas que pasan.
- Terminá el mensaje con la línea de atribución que indique el sistema.
- El hook del proyecto corre `npm run check` antes del commit y lo bloquea si falla. Si lo bloquea, corregí la causa; nunca lo saltees.

## 8. Informe al usuario

En pocas líneas: qué se construyó, qué se probó y cómo, qué falló durante las pruebas y cómo se corrigió, decisiones que no estaban en el diseño y qué quedó pendiente. Sin presentar como verificado algo que no se verificó.
