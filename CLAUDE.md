# Plataforma de catálogos multitenant

SaaS de catálogos digitales con pedidos a WhatsApp para muchos comercios. Next.js (App Router) + TypeScript en Vercel, Supabase (Postgres, Auth, Storage). Monolito modular: una sola app, un solo proyecto Supabase por entorno.

**Fuente de verdad del diseño:** `docs/diseno-tecnico-v1.md` (original con diagrama: https://claude.ai/artifact/XZeyeFibDtJQLo6LsJRhj2). Antes de implementar algo, leé la sección que corresponde. Si algo del código contradice el diseño, se discute y se actualiza el diseño; no se improvisa.

Idioma: el usuario habla español rioplatense. Código, nombres de tablas y columnas en inglés; textos de la interfaz, comentarios de negocio y documentación en español.

## Cómo se trabaja

- El proyecto avanza **por etapas** (ver tabla abajo). Trabajá solo la etapa actual; no adelantes funcionalidades de etapas siguientes ni nada marcado como "preparado" o "no desarrollar todavía" en el diseño.
- Una etapa termina cuando lo construido se puede verificar y todas las pruebas pasan. Cada etapa cierra con un commit.
- Cambios chicos y revisables. Explicá las decisiones que no estén en el diseño.

| Etapa | Contenido | Estado |
| --- | --- | --- |
| 0 | Preparación del entorno, repo, este archivo | Hecha |
| 1 | Esqueleto Next.js + proxy por host (`*.localhost`) | Hecha |
| 2 | Migraciones del núcleo + RLS + seed Alfa/Beta + pgTAP | Siguiente |
| 3 | Auth + panel vacío con `requireTenantAccess` | Pendiente |
| 4 | Catálogo en el panel | Pendiente |
| 5 | Imágenes | Pendiente |
| 6 | Catálogo público + caché | Pendiente |
| 7 | Pedidos + WhatsApp | Pendiente |
| 8 | Alta de comercios (`provision_tenant` + asistente) | Pendiente |
| 9 | Panel central | Pendiente |
| 10 | CI, staging, producción, migración de clientes actuales | Pendiente |

## Reglas de seguridad (no negociables)

1. **El comercio nunca lo dice el navegador.** Catálogo: sale del host. Panel: sale de la ruta `/[tenant]` y se verifica contra `tenant_members` con `requireTenantAccess` dentro de cada server action y route handler. Ningún endpoint acepta `tenant_id` del cliente.
2. **Toda tabla de un comercio** lleva `tenant_id not null` (primera columna, FK a `tenants on delete cascade`, inmutable por trigger), `unique (tenant_id, id)`, FK compuestas `(tenant_id, x_id)` hacia sus padres e índices que empiezan por `tenant_id`.
3. **Cada tabla nueva nace completa en la misma migración:** restricciones, índices, `enable row level security`, una política por operación y por rol (nunca `for all`), `using` + `with check` en updates, permisos revocados a `anon` donde corresponda. Y en el mismo cambio, su bloque de pruebas pgTAP de RLS.
4. **Nunca** usar `user_metadata` / `raw_user_meta_data` para autorizar.
5. **Funciones `security definer`** van en el esquema `private` con `set search_path = ''`. En `public` solo las de la lista cerrada del diseño (`storefront_by_host`, `slug_available`, `accept_invitation`).
6. **La clave secreta de Supabase** (`SUPABASE_SECRET_KEY`, service_role) solo se importa desde `src/lib/supabase/service.ts`, y ese módulo solo lo usan: panel central (`core/admin`), creación de pedidos, alta de comercios y cron. Nunca con prefijo `NEXT_PUBLIC_`.
7. **Caché:** solo lo público y siempre con el comercio en la clave. Dentro de una función cacheada está prohibido leer `headers()`, `cookies()` o la sesión. El catálogo usa la clave pública sin cookies. Panel y admin nunca se cachean. Nada de `Map` o variables globales con datos de comercios.
8. **Pedidos:** el navegador manda solo IDs y cantidades; precios y totales los calcula `private.create_order` en la base.
9. **En el servidor** usar `auth.getUser()` (o `getClaims()`), nunca confiar en `getSession()`.
10. Validar con Zod todo lo que entra al servidor. Errores públicos genéricos.

## Convenciones de datos

- IDs `uuid` (`gen_random_uuid()`); `bigint identity` solo en `events` y `audit_log`.
- Estados con `text` + `CHECK`, no `enum`.
- Dinero en `bigint` (centavos). Fechas `timestamptz`.
- Tablas con prefijo de módulo: `catalog_*`, `orders`/`order_items`; futuros `bookings_*`, `crm_*`, `ai_*`.
- Imágenes: se guarda la ruta (`{tenant_id}/...`), nunca la URL.

## Estructura y fronteras

- `src/app` (rutas delgadas) → usa `src/modules/*` y `src/core/*`.
- `src/modules/*` → usa solo `src/core` y `src/lib`. **Un módulo nunca importa a otro**; se comunican por la tabla `events`.
- Migraciones solo en `supabase/migrations` vía `supabase migration new`, nombre `AAAAMMDDHHMMSS_<modulo>_<cambio>.sql`. Solo hacia adelante: nunca editar una migración ya aplicada.
- Nunca cambiar el esquema desde el dashboard de Supabase.

## Next.js 16

Next.js 16.4 con `cacheComponents` activado, Tailwind 4 y React 19.3. Tiene cambios que no coinciden con versiones anteriores (el middleware ahora es `src/proxy.ts`, caché con `'use cache'`, rutas dinámicas con `<Suspense>`). **Antes de usar una API de Next, leé su guía en `node_modules/next/dist/docs/`** (ver `AGENTS.md`).

## Comandos

- `npm run dev` — servidor local en `:3000`.
- `npm run check` — tipos (`next typegen && tsc`), lint y pruebas unitarias. Tiene que pasar antes de cada commit.
- `npm run test` — pruebas unitarias con Vitest (`src/**/*.test.ts`).
- `npm run build` — build de producción.
- `npx supabase <comando>` — CLI de Supabase fijada en `devDependencies`.

## Pendientes conocidos

- En `next dev`, `www.localhost` no redirige bien a `localhost` (Next vuelve relativa la URL); en producción debería funcionar. Verificar en staging.
- Reglas de ESLint para fronteras entre módulos y `service.ts`: se agregan cuando exista el primer módulo (etapa 4) y el cliente de servicio (etapa 7/8).
- `/panel` y `/admin` hoy salen estáticas en el build porque no leen datos; desde la etapa 3 tienen que ser dinámicas (el diseño pide que CI lo verifique).

## Entorno local (Windows)

- Supabase local con la CLI (`npx supabase start` / `stop`; requiere Docker Desktop abierto). API `127.0.0.1:54321`, base `127.0.0.1:54322`, Studio `127.0.0.1:54323`. `analytics` y `edge_runtime` están apagados en `supabase/config.toml` (no se usan en v1 y ahorran RAM). Hosts locales: `alfa.localhost:3000`, `app.localhost:3000`, `admin.localhost:3000`.
- Comercios de prueba: Alfa y Beta (publicados), Gamma (suspendido).
