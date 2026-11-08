---
name: auditoria-aislamiento
description: Auditoría de filtraciones entre comercios (tenants) en este SaaS: busca consultas sin tenant_id, Server Actions o Route Handlers sin requireTenantAccess, políticas RLS flojas, cachés sin el comercio en la clave, usos de la clave secreta fuera de la lista cerrada y datos del navegador usados para decidir el comercio. Usala antes de cerrar una etapa que tocó base, acciones, rutas o caché, cuando el usuario pida "auditoría", "revisión de seguridad", "¿hay alguna filtración?", "¿un comercio puede ver datos de otro?", o antes de salir a producción.
---

# Auditoría de aislamiento entre comercios

El riesgo número uno de este SaaS es que un comercio vea o modifique datos de otro (diseño, secciones 0, 5, 12 y 13). Esta auditoría revisa las tres barreras (código, RLS y restricciones de la base) y la caché. Es de **solo lectura**: no corrijas nada durante la auditoría; reportá y proponé.

## Alcance

- Por defecto: los cambios desde el último commit de cierre de etapa (`git log --oneline` y `git diff <commit>..HEAD`), más el código que tocan.
- Si el usuario pide una auditoría completa: todo `src/` y `supabase/`.

## Qué revisar

### 1. Origen del comercio (regla 1 de CLAUDE.md)
- Cada `"use server"` exportada y cada Route Handler del panel llama a `requireTenantAccess(slug, permiso)` **dentro** de la función, no solo en un layout.
- Ningún endpoint toma `tenant_id`, `tenantId` o un id de comercio del cuerpo, la query o un header. El catálogo público lo saca del host; el panel, del slug verificado.
- Los ids que sí vienen del navegador (producto, categoría) se validan con Zod y se usan junto con el `tenantId` verificado (`.eq("tenant_id", tenantId).eq("id", id)`).
- El permiso pedido coincide con la acción (`settings.write` para configuración, etc.; ver `src/core/auth/permissions.ts`).

Para encontrarlos: buscá `"use server"`, `export async function` en `actions.ts` y `route.ts`, y `tenant_id`/`tenantId` en `src/`.

### 2. Consultas
- Toda lectura o escritura a una tabla de comercio filtra por `tenant_id` además de RLS.
- No hay consultas con la clave secreta (`service_role`) fuera de `src/lib/supabase/service.ts` y su lista cerrada (panel central, creación de pedidos, alta de comercios, cron). Revisá que `eslint.config.mjs` lo siga prohibiendo.
- Ninguna variable con `SECRET` o `SERVICE` tiene prefijo `NEXT_PUBLIC_`.

### 3. Base de datos
- Corré `npm run db:test`, `npm run db:lint` y `npm run db:advisors` y reportá cualquier falla.
- En las migraciones nuevas: RLS activado, `revoke all ... from anon, authenticated`, permisos por columna en `update` (sin `tenant_id`), políticas por operación con `to`, `using` + `with check` en `update`, FK compuestas, `prevent_tenant_change`, `security definer` solo en `private` con `search_path = ''`.
- Funciones `security definer` nuevas: ¿verifican `auth.uid()` o reciben solo datos ya verificados? ¿Pueden filtrar información de otro comercio por sus mensajes de error?
- Mensajes de error y límites: un usuario sin permiso debe recibir "permiso denegado", no datos de otro comercio (por eso los límites de plan son triggers `AFTER`).

### 4. Caché (diseño, sección 12)
- Ninguna función con `'use cache'` lee `headers()`, `cookies()` ni la sesión; todo lo que define el resultado llega como argumento e incluye el comercio (host o `tenantId`).
- Los tags de caché llevan el comercio y se arman en un solo lugar.
- Panel y admin no usan `'use cache'` ni `'use cache: private'` con datos de comercios.
- No hay `Map`, arrays o variables de módulo que guarden datos de comercios entre peticiones.
- El catálogo público no lee ni escribe cookies de sesión.

### 5. Archivos (desde la etapa 5)
- Rutas de Storage empiezan por el `tenant_id` verificado; las políticas de Storage exigen pertenencia a la carpeta; no hay política de listado anónimo.

### 6. Pruebas
- Cada tabla nueva tiene su bloque de RLS por rol y figura en la lista de cobertura.
- Hay al menos una prueba de integración que intenta escribir en otro comercio con una sesión real.

## Informe

Usá exactamente esta estructura, en castellano y para alguien que no es especialista:

```
## Auditoría de aislamiento · <fecha> · <alcance>

Resultado: <Sin hallazgos | N hallazgos (X críticos)>

### Hallazgos
| # | Gravedad | Dónde (archivo:línea) | Qué puede pasar | Cómo corregirlo |

### Verificado sin problemas
- <lista corta de lo revisado que está bien>

### Pruebas corridas
- db:test, db:lint, db:advisors, test:integration: <resultado>
```

Gravedad: **Crítico** (un comercio puede leer o modificar datos de otro), **Alto** (podría pasar con un error de código probable), **Medio** (defensa en profundidad faltante), **Bajo** (mejora). No marques como crítico algo hipotético sin explicar el camino concreto por el que pasaría.

Para una revisión más amplia, combiná con `/security-review` sobre los mismos cambios.
