# Plataforma de catálogos multitenant

SaaS de catálogos digitales con pedidos a WhatsApp para muchos comercios. Next.js (App Router) + TypeScript en Vercel, Supabase (Postgres, Auth, Storage). Monolito modular: una sola app, un solo proyecto Supabase por entorno.

**Fuente de verdad del diseño:** `docs/diseno-tecnico-v1.md` (original con diagrama: https://claude.ai/artifact/XZeyeFibDtJQLo6LsJRhj2). Antes de implementar algo, leé la sección que corresponde. Si algo del código contradice el diseño, se discute y se actualiza el diseño; no se improvisa.

Idioma: el usuario habla español rioplatense. Código, nombres de tablas y columnas en inglés; textos de la interfaz, comentarios de negocio y documentación en español.

**Hablale SIEMPRE en español, nunca en inglés, salvo que el usuario lo pida.** Vale para todo mensaje: estados cortos, tablas, pasos guiados y después de leer páginas, logs o errores en inglés. Revisá el idioma antes de mandar cada mensaje. Los nombres que aparecen en pantalla (botones, menús) se pueden citar tal cual, pero la explicación va en español y simple: el usuario no es técnico en infraestructura.

## Cómo se trabaja

- El proyecto avanza **por etapas** (ver tabla abajo). Trabajá solo la etapa actual; no adelantes funcionalidades de etapas siguientes ni nada marcado como "preparado" o "no desarrollar todavía" en el diseño.
- Una etapa termina cuando lo construido se puede verificar y todas las pruebas pasan. Cada etapa cierra con un commit.
- Cambios chicos y revisables. Explicá las decisiones que no estén en el diseño.

| Etapa | Contenido | Estado |
| --- | --- | --- |
| 0 | Preparación del entorno, repo, este archivo | Hecha |
| 1 | Esqueleto Next.js + proxy por host (`*.localhost`) | Hecha |
| 2 | Migraciones del núcleo + RLS + seed Alfa/Beta + pgTAP | Hecha |
| 3 | Auth + panel vacío con `requireTenantAccess` | Hecha |
| 4 | Catálogo en el panel | Hecha |
| 5 | Imágenes | Hecha |
| 6 | Catálogo público + caché | Hecha |
| 7 | Pedidos + WhatsApp | Hecha |
| 8 | Alta de comercios (`provision_tenant` + asistente) | Hecha |
| 9 | Panel central | Hecha |
| 10 | CI, staging, producción, migración de clientes actuales | En curso: 10a (CI y E2E), 10b (GitHub), 10c (staging) y 10d (Sentry y tarea diaria sin suspensión) hechas; sigue 10e (producción: guía `docs/runbooks/produccion.md` y flujo `produccion.yml` escritos el 2026-11-24; Vercel y Supabase Pro contratados y Supabase de producción configurado; publicado el 2026-11-25 en `vidri.ar`, con administrador y recorrido completo probados; siguen captcha de Auth, tarea diaria, Sentry, legales y comercio de ejemplo según la guía) |
| 11 | Rediseño: estructura de PPW con los colores de Vidri y recorridos de MyShp (`docs/design/referencia-ppw.md`, `referencia-myshp.md`). Partes: 11a fundaciones (colores, títulos sin serifa en el panel, piezas comunes), 11b catálogo, 11c panel (aspecto), 11d panel (recorridos), 11e "Pedí tu demo" (sin registro automático, botón de WhatsApp, comercio de ejemplo, modo soporte con edición) | En curso: 11a hecha el 2026-11-26 (colores nuevos, títulos sin serifa en el panel con `data-surface="panel"`, piezas en `src/ui/`: `button-classes`/`button`, `pill`, `toast`, `skeleton`, `page-header`; diseño `docs/superpowers/specs/2026-11-26-rediseno-fundaciones-design.md`). Menores pendientes: "Sí, cancelar" sin borde, dos interruptores con `bg-line`, tokens nuevos sin valor en admin/marketing. 11b (catálogo) hecha el 2026-11-26 (`docs/superpowers/specs/2026-11-26-rediseno-catalogo-design.md`; menores pendientes: esqueleto de carga y páginas "no disponible" con la forma y letra viejas, descripción de la fila Carta tapada para lectores de pantalla, tarjeta de estado vacía si no hay datos, iniciales con emojis). Sigue 11c (panel, aspecto) |

## Skills y hooks del proyecto

Procedimientos guardados en `.claude/skills/` (se versionan con el repo). Se activan solos cuando la tarea coincide, o se piden con `/nombre`:

| Skill | Cuándo |
| --- | --- |
| `/nueva-tabla` | Antes de crear o cambiar cualquier tabla, columna o política RLS |
| `/cerrar-etapa` | Para verificar todo y cerrar una etapa con su commit |
| `/auditoria-aislamiento` | Antes de cerrar una etapa que tocó base, acciones, rutas o caché; antes de producción |
| `/diseno-interfaz` | Antes de crear o cambiar pantallas, componentes o estilos |

Hook (`.claude/settings.json` + `.claude/hooks/check-before-commit.mjs`): antes de cada `git commit` que ejecute Claude corre `npm run check` y bloquea el commit si falla. No saltearlo: si bloquea, corregir la causa.

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
- `npm run test:integration` — pruebas contra Supabase local con usuarios reales del seed (`tests/integration`). Requiere `npx supabase start` y `npm run db:reset`.
- `npm run build` — build de producción.
- `npm run db:reset` — recrea la base local: aplica todas las migraciones desde cero, carga `supabase/seed.sql` y sube fotos de muestra (`scripts/seed-images.mjs`, solo local, con la sesión de cada dueño).
- `npm run db:test` — pruebas pgTAP de esquema y RLS (`supabase/tests`). Tienen que pasar antes de cada commit que toque la base.
- `npm run db:lint` — linter de Supabase sobre el esquema.
- `npm run db:types` — regenera `src/types/database.ts` (se versiona; regenerar después de cada migración).
- `npm run db:advisors` — advisors de seguridad y rendimiento de Supabase.
- `npm run test:e2e` — recorridos E2E con Playwright contra `next start` (requieren `npm run build` y `npm run db:reset` antes).
- `npm run check:env` (dentro de `check`), `check:types` (tipos generados contra el esquema, con Supabase levantado) y `check:build` (después del build: ni datos del seed ni secretos en lo prerenderizado ni en el JavaScript del navegador).
- `npx supabase <comando>` — CLI de Supabase fijada en `devDependencies`.

## Base de datos: cómo agregar una tabla

1. `npx supabase migration new <modulo>_<cambio>` y escribir tabla + restricciones + índices + RLS + políticas + permisos en ese archivo, siguiendo el patrón de `20261107175938_core_tenants.sql` (revocar todo a `anon`/`authenticated`, devolver lo justo, `UPDATE` por columna).
2. Agregar la tabla a la lista de cobertura de `supabase/tests/00_schema.test.sql` (si no, esa prueba falla).
3. Escribir su bloque de pruebas de RLS por rol (dueño, staff, otro comercio, anónimo, sin comercio).
4. `npm run db:reset && npm run db:test && npm run db:lint && npm run db:advisors && npm run db:types`.

Funciones auxiliares de RLS: `private.my_tenant_ids(roles)`, `private.my_teammate_ids()`, `private.tenant_is_public(tenant_id)`, `private.tenant_plan(tenant_id)`. Usarlas como `tenant_id in (select private.my_tenant_ids())`.

## Autenticación y panel (cómo está armado)

- Clientes de Supabase: `src/lib/supabase/server.ts` (sesión del usuario, uno por petición) y `proxy-session.ts` (refresco de sesión en el proxy, solo hosts `app.` y `admin.`). Cookies sin atributo Domain.
- Sesión: `getCurrentUser()` / `requireUser()` en `src/core/auth/session.ts` (usan `getClaims()`).
- Acceso a un comercio: `requireTenantAccess(slug, permiso)` en `src/core/tenancy/require-access.ts`, dentro de cada página, Server Action y Route Handler del panel. Permisos por rol: `src/core/auth/permissions.ts`.
- Páginas del panel: la sesión se lee dentro de `<Suspense>` (Next 16). Nada del panel se cachea: no usar `'use cache'` ni `'use cache: private'` con datos de comercios.

## Trampas conocidas de Next.js 16 con hosts reescritos

1. **En `next dev`, `request.nextUrl` siempre tiene host `localhost:3000`**, no el host real (`app.localhost`). Para redirigir desde Route Handlers usar un `Location` **relativo** (ver `src/app/auth/callback/route.ts`).
2. **`redirect()` desde una Server Action se resuelve internamente, sin pasar por el proxy.** En el host del panel, `redirect("/")` muestra la landing. No redirigir a `/` desde acciones: devolver `redirectTo` y navegar desde el cliente (ver `AuthForm`), o redirigir a rutas de comercio (`/alfa/...`), que no existen sin el prefijo `/panel` y caen en una navegación normal.
3. **`notFound()` dentro de `<Suspense>` responde HTTP 200** con el contenido 404 y `noindex`. No filtra datos (verificado), pero el código HTTP no es 404.
4. Código que usa la sesión debe correr en el momento de la petición: `createSupabaseServerClient` llama a `connection()`.
5. **El `not-found.tsx` de un segmento no atrapa el `notFound()` de su propio layout.** El menú de `/panel/[tenant]/layout.tsx` llama a `requireTenantAccess`, así que la página de no encontrado del panel vive en `src/app/panel/not-found.tsx` (si no, sale el 404 genérico de Next en inglés).

## Pendientes conocidos

- En `next dev`, `www.localhost` no redirige bien a `localhost` (trampa 1). En staging funciona (`www.staging.vidri.ar` → 308 a `staging.vidri.ar`, con ruta y parámetros).
- Diseño y experiencia de uso: el usuario probó el recorrido completo en staging y le parecen flojos (catálogo, asistente, panel). Mejorarlos en una etapa propia, con `/diseno-interfaz`.
- Un host con punto final (`admin.staging.vidri.ar.`) responde 404 o corta la conexión. Pasa si se copia la dirección con el punto de una oración; no es grave, normalizarlo en el proxy cuando se toque.
- Invitación del alta asistida: el administrador de staging se creó con "Invite user" de Supabase y le llegó la plantilla de comercios ("Tu catálogo está listo"). Para invitar administradores, evaluar una plantilla o un flujo propio.
- Clave secreta: la lista cerrada está en `SERVICE_KEY_ALLOWED` de `eslint.config.mjs` (pedidos, alta y panel central). Un uso nuevo se agrega ahí, y a nada más.
- Paginación del listado de productos del panel: hoy trae hasta 1000; agregar paginación si un comercio Pro supera eso.
- Al entrar sin sesión a una pantalla interna (por ejemplo `/alfa/productos`), después del login se vuelve a `/alfa` y no a esa pantalla.
- La cookie de sesión de Supabase es legible desde JavaScript (comportamiento por defecto de `@supabase/ssr`). Evaluar `httpOnly` cuando se decida si el navegador necesita su propio cliente de Supabase (por ejemplo, Realtime en pedidos).
- E2E: están los 4 recorridos de humo del diseño (`e2e/`). Siguen a mano: el panel de pedidos después de un pedido, el panel central (pide MFA) y Ajustes.
- GitHub: el repo es privado en una cuenta gratis, así que las ramas no están protegidas (exigir CI en verde para fusionar pide GitHub Pro). CI corre y avisa, pero no bloquea. Revisarlo cuando entre otra persona al proyecto.
- Registro: en el primer intento de E2E, el envío antes de que cargaran React y Turnstile no mostró ni la confirmación ni un error. No se investigó; revisarlo con conexión lenta.
- Invitaciones de staff (crear, enviar correo, `accept_invitation`): quedan para cuando exista la pantalla de equipo.
- Sistema visual "Sobremesa" (`docs/design/sistema-visual.md`): lo usan el catálogo, el asistente, Ajustes, Pedidos y todo el panel del comercio. "Panel fácil" (2026-11-23, `docs/superpowers/specs/2026-11-23-panel-facil-design.md`): menú fijo abajo en el celular (`src/app/panel/[tenant]/_components/tenant-nav.tsx`, con el número de pedidos nuevos), inicio con botones grandes, productos con interruptor de stock optimista (`productos/_components/products-browser.tsx` + `setProductFlagAction`), formulario por bloques con interruptores (`Switch` de `src/ui/form.tsx`) y "Más detalles" plegado, categorías con flechas de 44 px. Crear un producto abre su edición (`?nuevo=1`) para sumar fotos; un producto nuevo nace visible en el catálogo. Categoría nueva/editar e importar usan los formularios genéricos restilizados.
- Catálogo para Base y Pro (decidido el 2026-11-22, sin plan Free): 4 partes en orden, ver `docs/superpowers/specs/2026-11-22-tarjeta-resultados-design.md`. Parte 1 (tarjeta de resultados, `public.tenant_order_stats` SECURITY INVOKER + `src/modules/orders/stats.ts`) parte 2 (plantilla única de grilla, `docs/superpowers/specs/2026-11-22-catalogo-nuevo-design.md`) y parte 3 (opciones del producto, `docs/superpowers/specs/2026-11-23-opciones-producto-design.md`) hechas. Sigue: 4 destacados solo Pro. Maquetas: https://claude.ai/artifact/WpMXexp1PqCh5yLm3tNQvb El panel central usa "Grafito" y la página principal, el registro y los legales usan "Noche".
- Catálogo público: en local el HTML sale con `Cache-Control: private, no-store`; en Vercel sale `public, max-age=0, must-revalidate` y `X-Vercel-Cache: HIT` (la CDN guarda la página por host). Verificado en staging con un comercio: su catálogo no aparece en otros hosts y los cambios del panel se ven. Repetir con dos comercios a la vez y medir si conviene `use cache: remote` (la caché de datos `'use cache'` vive por instancia).
- Página principal (`src/app/(marketing)`, estilo "Noche"): los precios son provisorios (salen de la tabla `plans`, se cambian por migración y se ven al desplegar). Términos y privacidad tienen los datos del responsable como `[PENDIENTE]` y `noindex`: completarlos, que los revise un abogado y sacar el `noindex` antes de producción. El botón "Mirá un catálogo de ejemplo" aparece solo con `DEMO_CATALOG_SLUG` y `DEMO_TENANT_ID` cargados en Vercel y ese comercio publicado (el id evita que otro que registre el mismo slug quede anunciado): crear el comercio de ejemplo desde la app y cargar las dos variables. La pregunta del fin de la prueba no promete aviso, y está bien: no hay correos de vencimiento (decisión 0005).
- Catálogo público: ficha de producto con link propio (para compartir). No está en ninguna etapa del diseño; decidir cuándo.
- Correo de confirmación e invitación: en staging ya salen por Resend (SMTP de `vidri.ar`, remitente `no-responder@vidri.ar`) con las plantillas del repo. Falta repetirlo en producción. Supabase no deja editar plantillas sin SMTP propio. En local los correos se ven en Mailpit (`127.0.0.1:54324`).
- Staff: Storage le permite subir archivos a la carpeta `branding` de su comercio (la política es por miembro), pero no cambiar el logo ni la portada, que es una columna solo del dueño. Como mucho deja archivos huérfanos, que limpia el barrido de la tarea diaria.
- `npm audit`: 17 alertas en herramientas de desarrollo (`picomatch` y `minimatch`, dentro de ESLint y Vitest). Producción tiene 0 (`npm audit --omit=dev`). `picomatch` no tiene versión corregida todavía. CI ya frena con `npm audit --omit=dev`; revisar las de desarrollo cuando salgan versiones corregidas. Nunca correr `npm audit fix --force` (baja ESLint y Vitest de versión mayor).
- Las pruebas pgTAP de pedidos y alta cuentan sobre los datos del seed: correr `npm run db:test` justo después de `npm run db:reset`. Las de integración y el uso en el navegador suman datos.
- Pedidos: el límite por IP usa `x-forwarded-for`, que en Vercel arma la plataforma. Fuera de Vercel ese header se puede falsificar (el límite de 200 por hora por comercio sigue valiendo). No servir la app detrás de otro proxy sin revisar esto.
- Pedidos: Turnstile usa las claves de prueba públicas en local. Staging tiene su sitio en Cloudflare; falta el de producción.
- Pedidos: notas internas del comercio en cada pedido. El diseño las menciona pero no tienen columna; ver `docs/decisions/0002-pedidos-implementacion.md`.
- Pedidos: Playwright cubre carrito → WhatsApp; la parte del panel (el pedido aparece y cambia de estado) sigue a mano.
- Opciones del producto (parte 3): tablas `catalog_option_groups` / `catalog_options` (RLS como el catálogo, límites 5 grupos y 20 opciones por trigger), `private.create_order` agrupa por producto + opciones ordenadas, valida pertenencia, disponibilidad, obligatorios y máximo, suma adicionales y guarda la copia en `order_items.options`; error `options_invalid` (detail = id del producto). Lógica compartida en `src/lib/product-options.ts`; la ficha le pasa lo elegido al botón de pedidos por `src/lib/option-selection.tsx` (contexto, así los módulos no se importan). Carrito `pedido:v2` con `optionIds` (`src/modules/orders/cart-lines.ts`, convierte `pedido:v1`). Panel: bloque `OptionsEditor` en la página del producto. Seed: "Hamburguesa a elección" de Alfa (a2…05). Fuera: stock por talle, fotos por color, opciones que restan.
- Interruptor de stock y de opciones: cambian al instante (optimista) y se guardan con una Server Action; si alguien navega en el mismo instante, el guardado puede no llegar. Si molesta, mostrar "Guardando…" hasta que confirme.
- Cobro manual y sin correos automáticos (decisión `docs/decisions/0005-avisos-y-errores.md`): la tarea diaria solo pasa a `past_due` y nunca suspende; suspender es a mano desde el panel central. Si llega el cobro automático (Mercado Pago), revisar si vuelve la suspensión automática.
- Sentry: andando en staging (organización y proyecto `vidri`, sin guardar IP). En producción, cargar `NEXT_PUBLIC_SENTRY_DSN` (el mismo) y `NEXT_PUBLIC_SENTRY_ENVIRONMENT=production` (paso 12 de `docs/runbooks/staging.md`). Sin mapas de código: los errores del navegador llegan minificados (se agregan con `SENTRY_AUTH_TOKEN` si hace falta).
- Vercel `vidri-staging` arma una vista previa de cada push a `main`, que falla por no tener claves y manda un correo de error: Settings → Git → Ignored Build Step → "Only build production". No ponerlo en `vercel.json`: el proyecto de producción lee el mismo archivo.
- Panel central: edición como soporte (cambiar catálogo o ajustes en nombre del comercio, auditada). Hoy el modo soporte es solo lectura.
- Panel central: borrado definitivo de un comercio (pedido el 2026-11-23). **Solo el superadmin desde el panel central, nunca el dueño.** Hoy solo se puede cancelar (catálogo en 404, sin acceso, datos guardados; el diseño dice "nunca DELETE en v1"). A construir: botón solo para comercios ya cancelados, confirmación escribiendo el nombre, borrado en cascada de la base (las FK de comercio ya tienen `on delete cascade`), borrado de sus fotos en Storage por API (no se puede con SQL), liberar el slug y dejar constancia en una auditoría que no dependa del comercio borrado. Actualizar el diseño (sección 3/10) al hacerlo. Sirve también para pedidos de supresión de datos (ley 25.326).
- Panel central: en staging ya están la plantilla de invitación, MFA TOTP, `CRON_SECRET` y el administrador (sin seed). Falta producción.
- Panel central: el título de la pestaña de un 404 dice el nombre de la pantalla (por ejemplo, "Comercios · Panel central"). No muestra datos, pero confirma que la pantalla existe.

## Staging (cómo está armado)

- Guía completa y checklist: `docs/runbooks/staging.md`. Dominio `vidri.ar` (NIC Argentina, DNS en Vercel). Staging en `staging.vidri.ar`, `app.`, `admin.` y `{slug}.staging.vidri.ar`.
- Vercel: proyecto `vidri-staging` con rama de producción `staging` (así corren los crons). Supabase: proyecto `vidri-staging` (Free, Oregon; producción va en São Paulo). Correo: Resend con SMTP en Supabase. Turnstile: sitio propio.
- Migraciones: job `migrate-staging` de `ci.yml`, después de CI, por el session pooler (la conexión directa de Supabase es solo IPv6 y GitHub no tiene IPv6) y con `--yes` (sin eso la CLI cancela al no poder confirmar).
- Datos: sin seed. Los comercios de prueba se crean desde la app; el administrador se dio de alta con un `insert` en `platform_admins` desde el editor SQL.
- Las claves secretas las carga siempre el usuario en cada panel (Vercel, Supabase, GitHub); nunca pasan por el chat ni por el repo.

## Producción (cómo se publica)

- Guía, límites de gasto y checklist: `docs/runbooks/produccion.md`. Dominio `vidri.ar`, Supabase Pro en São Paulo (organización propia), Vercel Pro (mismo equipo que staging), proyecto `vidri`.
- Publicar: a mano, Actions → "Publicar en producción" (`.github/workflows/produccion.yml`, solo desde `main`). Comprueba CI en verde y que el commit esté en `staging`, migra por el session pooler (secretos `PRODUCTION_PROJECT_REF`, `PRODUCTION_DB_PASSWORD`, `PRODUCTION_POOLER_HOST`) y recién después hace avance directo de la rama `produccion`, que es la rama de producción del proyecto de Vercel. Nunca empujar a `produccion` a mano.
- Límites: Spend Management de Vercel con pausa, Spend Cap de Supabase, Resend/Sentry/GitHub sin tarjeta. Las fotos no usan el optimizador de Vercel (`unoptimized`): mantenerlo así.
- Pendiente: los límites de Supabase Auth por IP (inicios de sesión y registros: 30 cada 5 minutos) cuentan la IP del servidor de Vercel, porque el login y el registro se llaman desde Server Actions. Con muchos comercios entrando a la vez puede frenar a gente legítima; revisar (subir el límite o reenviar la IP real) cuando crezca.
- Captcha de Supabase Auth (2026-11-25): registro, login y recuperación mandan el token de Turnstile a Supabase (`captchaToken`, `src/core/auth/captcha.ts`, formularios con `useTurnstileSubmit`), y **lo verifica Supabase, no nuestro servidor** (el token es de un solo uso). En local está activo en `supabase/config.toml` con la clave secreta de prueba; scripts y pruebas que inician sesión directo mandan `XXXX.DUMMY.TOKEN.XXXX`. En staging y producción se activa en el panel de Supabase después de publicar el código (staging paso 13, producción paso 29). Si se apaga en Supabase, el registro queda sin control de bots: no dejarlo apagado.

## CI y E2E (cómo está armado)

- Repo: `github.com/Franco320i/MultiSaaS` (privado), ramas `main` y `staging`. No hay `gh` instalado: el push usa el administrador de credenciales de Git y las corridas se ven en la pestaña Actions.
- `.github/workflows/ci.yml`, en cada PR y push a `main`/`staging` (entre 5 y 13 minutos; lo que más varía es instalar las dependencias de Playwright): gitleaks (imagen oficial con versión fija, sobre toda la historia; `gitleaks-action` falla en el primer push de una rama), `check:env`, `npm audit --omit=dev`, Supabase local, `.env.local` armado desde `supabase status`, `check`, `db:reset`, pgTAP, `db:lint`, `db:advisors`, `check:types`, integración, build, `check:build`, `db:reset` y E2E. Si falla, sube el reporte de Playwright.
- Playwright (`playwright.config.ts`): un worker, Pixel 7, levanta `npm run start` (en local reusa el servidor del puerto 3000: que sea `next start`, no `next dev`). Helpers en `e2e/helpers.ts`: `login(page, email, next)` espera el destino exacto, `waitForTurnstile` antes de enviar formularios con Turnstile y `confirmationLink` lee Mailpit. El link de WhatsApp se intercepta con `page.route`.
- Los E2E no dependen del orden ni ensucian: el registro crea un comercio nuevo por corrida y el de caché deja el producto de Alfa como estaba.
- `check:build` busca UUID, correos, nombres de comercio y hosts del seed. No usa nombres de productos: son palabras comunes que aparecen en ejemplos de la interfaz.

## Módulos (cómo está armado el catálogo)

- Cada módulo vive en `src/modules/<nombre>/`: `schemas.ts` (Zod), `queries.ts` (lecturas), `mutations.ts` (escrituras sin Next, probables contra la base), `actions.ts` (Server Actions: `requireTenantAccess` + Zod + mutación), `components/` e `index.ts` (lo que pueden importar las rutas).
- Las fronteras las verifica ESLint (`eslint.config.mjs`): un módulo no importa a otro, `core` no importa módulos, `lib`/`ui` no importan `core` ni módulos. **Agregar cada módulo nuevo a la lista `MODULES`.**
- Formularios: ante un error, la acción devuelve `fields` con lo enviado y el formulario se vuelve a montar con esos valores (React vacía el formulario después de cada envío).
- Después de mutar sin redirigir: `refresh()` de `next/cache`. Para redirigir: rutas de comercio (`/${slug}/...`).
- Dinero: `parseAmountToCents` / `formatCents` / `centsToInput` en `src/lib/money.ts` (formato argentino). Slugs: `src/lib/slugify.ts`; ante choques se numeran (`-2`, `-3`); el slug no cambia al renombrar.
- Componentes de formulario genéricos: `src/ui/form.tsx`.
- Fotos: el navegador achica (`components/resize-image.ts`), el servidor re-procesa con sharp (`src/lib/images/process.ts`: solo JPEG/PNG/WebP, sin metadatos, 480 y 1280 px en WebP) y sube con la sesión del usuario (`images.ts`). En la base va la ruta base `{tenant}/products/{product}/{image}`; la URL la arma `publicImageUrl` (`src/lib/images/url.ts`). Server Actions aceptan hasta 4 MB (`next.config.ts`).
- Storage no deja borrar archivos con SQL: las pruebas de borrado van en integración, con la API real.

## Catálogo público (cómo está armado)

- Rediseño 11b (2026-11-26): títulos sin serifa (`data-surface="storefront"`), colores derivados del color del comercio en el servidor (`brandShades` → `brand2`/`brandTint`/`brandPage` en el `Storefront` cacheado), portada con logo montado, tarjeta de estado (`storeStatus`, `TodayHours`), buscador y categorías fijos, **Carta o Grilla según el rubro** (`catalogLayout`; el comercio NO lo elige: no agregar esa opción), aviso "Agregado al pedido" y barra/panel lateral del pedido. Ver `docs/design/sistema-visual.md`.
- Plantilla única (parte 2): `StorefrontView` (servidor: portada, tarjeta de estado, "Todos los pedidos incluyen") + `CatalogBrowser` (cliente: buscador, orden, píldoras, grilla) + `ProductSheet` (ficha en `<dialog>` con `history.pushState`: Atrás la cierra). Lógica pura y probada en `src/modules/catalog/presentation.ts`; listas fijas (etiquetas, medios de pago, límites) en `src/lib/catalog-options.ts`, iguales a los CHECK de `20261122220611_catalog_details.sql`. Los botones de pedidos llegan como `productAction(producto, "card" | "sheet")`.
- `publicImageUrl` lee `NEXT_PUBLIC_IMAGES_BASE_URL` directo (no `env.public`): la usa también la ficha en el navegador y `env.public` llevaría el prefijo de claves secretas al JavaScript público (check:build lo frena).
- Deploy antes que la migración: en staging, Vercel publica enseguida y `migrate-staging` aplica las migraciones después de CI (5 a 13 minutos). Si el código lee columnas nuevas, el catálogo falla en ese rato. En producción, migrar antes de desplegar (diseño, sección 14).
- `/sites/[host]` lee `params` dentro de `<Suspense>`: la cáscara estática es solo el esqueleto. `getStorefront(host)` (`src/core/tenancy/storefront.ts`) llama a `public.storefront_by_host` y `getPublicCatalog(tenantId)` (`src/modules/catalog/public-queries.ts`) lee categorías, productos y fotos; las dos con `'use cache'`, cliente público sin cookies (`src/lib/supabase/public.ts`) y el host o el comercio como único argumento.
- Tags solo desde `src/lib/cache/tags.ts`. Cada Server Action del catálogo termina con `revalidatePublicCatalog(access.tenantId)` (`updateTag`) después de escribir. Una acción nueva del catálogo tiene que hacer lo mismo.
- Vida de la caché: catálogo y comercio 1 hora, comercio no disponible unos minutos, host desconocido 60 s.
- Lo que depende de la hora ("Abierto ahora") se calcula en el navegador (`OpenStatus`), para no meter la hora en el HTML cacheado.
- Color del comercio: `theme.brand` del comercio o `default_theme.brand` de su plantilla, validado (`src/lib/color.ts`) y con texto elegido por contraste AA.
- Probar la caché de verdad con `next build` + `next start` (configuración `next-start` en `.claude/launch.json`); en `next dev` la caché no se comporta igual.

## Pedidos (cómo está armado)

- Decisiones que completan el diseño: `docs/decisions/0002-pedidos-implementacion.md`.
- Base: `orders` y `order_items` (nadie inserta desde el navegador; los miembros solo cambian `status`), `private.create_order` (precios, envío, mínimo, numeración por comercio, idempotencia y `order.created`), `private.rate_limit_hit` y sus envoltorios `public.*`, que solo puede ejecutar `service_role`.
- Catálogo: `AddToCartButton` y `Ordering` (barra "Ver pedido" + hoja en `<dialog>`) del módulo `orders`, conectados por la ruta `/sites/[host]` con los espacios de `StorefrontView`. El carrito vive en `localStorage` (`pedido:v1`) y los datos del cliente en `datos:v1`.
- `POST /api/orders` (`src/app/api/orders/route.ts`): comercio desde el header Host → `submitOrder` (`src/modules/orders/submit.ts`, sin Next y probado) → `createOrder` / `withinRateLimits` (`create.ts`, el único archivo con la clave secreta). Mensaje y link de WhatsApp en `whatsapp.ts`.
- Panel: `/[tenant]/pedidos` (en curso y terminados) y `/[tenant]/pedidos/[id]`, con permiso `orders.manage`, `setOrderStatusAction`, actualización cada 20 s (`OrdersAutoRefresh`) y "(N)" en el título de la pestaña. Recorrido en el panel: **Nuevo → Confirmado → Entregado** + Cancelar (2026-11-26, ver `0002`); `preparing`/`ready` quedan solo para pedidos viejos.
- Seed: Alfa #1 (nuevo, envío), Alfa #2 (confirmado) y Beta #1. Las pruebas de integración cambian estados y consumen números: `npm run db:reset` deja todo como al principio.

## Alta de comercios (cómo está armado)

- Decisiones que completan el diseño: `docs/decisions/0003-alta-de-comercios.md`.
- Registro: `{dominio}/registro` (`src/app/(marketing)/registro`, `registerUser` en `src/core/auth/register.ts`, con Turnstile verificado por Supabase Auth). La confirmación llega con la plantilla `supabase/templates/confirmation.html` y vuelve a `app.{dominio}/auth/callback?…&next=/nuevo`.
- Asistente: `app.{dominio}/nuevo` (paso 1, `provisionTenantAction` → `provisionTenant` en `src/core/tenancy/provision.ts`) y `/[tenant]/configurar?paso=marca|contacto|horarios|productos|publicar`. Los mismos formularios están en `/[tenant]/ajustes` (solo el dueño, `settings.write`). El inicio del panel muestra `SetupChecklist`.
- Módulo `src/modules/settings`: schemas, queries, mutations (con la sesión: RLS deja al dueño), actions y `cache.ts`. Guardar invalida `tenant:{id}:settings`; publicar invalida además los `host:{host}`.
- Importador: `/[tenant]/productos/importar` (`parseSpreadsheet` en `src/modules/catalog/import.ts` y `importProducts` en `mutations.ts`).
- URLs de la plataforma: `platformUrl(ROOT_DOMAIN, subdominio, ruta)` en `src/lib/urls.ts`. QR: `src/lib/qr.ts` (data URI SVG, se muestra con `<img>`).

## Panel central (cómo está armado)

- Decisiones que completan el diseño: `docs/decisions/0004-panel-central.md`. Estilo "Grafito": `data-surface="admin"` en `src/app/admin/layout.tsx`.
- Acceso: `requirePlatformAdmin(ruta, rol)` (`src/core/admin/access.ts`) dentro de cada página y acción: sesión + `platform_admins` + MFA (aal2). `/mfa` para activarlo o pedir el código. Sin acceso → 404.
- Datos: `src/core/admin/service.ts` (único archivo del panel con la clave secreta). Lecturas `admin_tenants` y `admin_overview`. Escrituras `admin_*`, auditadas y con motivo.
- Pantallas en `src/app/admin/(panel)`: Resumen, Comercios (`?q=`, `?filtro=`, `?pagina=`), Ficha (cobros, estado, plan, extensión), Modo soporte (solo lectura, auditado), Alta asistida y Auditoría. Acciones en `actions.ts`, que al cambiar estado o vigencia invalidan el catálogo del comercio.
- Errores: Sentry (`src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/app/global-error.tsx`) con el filtro de privacidad `src/lib/observability/scrub.ts`. Sin `NEXT_PUBLIC_SENTRY_DSN` no se envía nada. Un dato nuevo que pueda traer datos de clientes en errores se agrega al filtro, con su prueba.
- Tarea diaria (solo marca `past_due`, nunca suspende): `GET /api/cron/daily` con `Authorization: Bearer <CRON_SECRET>` (vercel.json). Para probarla en local:

```bash
curl -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env.local | cut -d= -f2)" http://localhost:3000/api/cron/daily
```

- Probar en local: `admin.localhost:3000` con `admin@example.com` (contraseña del seed), activar el MFA con una app autenticadora. `npm run db:reset` borra el factor.
- Las pruebas de integración corren un archivo por vez (`fileParallelism: false`), porque comparten la base.

## Entorno local (Windows)

- Supabase local con la CLI (`npx supabase start` / `stop`; requiere Docker Desktop abierto). API `127.0.0.1:54321`, base `127.0.0.1:54322`, Studio `127.0.0.1:54323`. `analytics` y `edge_runtime` están apagados en `supabase/config.toml` (no se usan en v1 y ahorran RAM). Hosts locales: `alfa.localhost:3000`, `app.localhost:3000`, `admin.localhost:3000`.
- Si Docker Desktop no está abierto, `npm run db:types` escribe el mensaje de error dentro de `src/types/database.ts` (redirige la salida). Si pasa, `git checkout -- src/types/database.ts`, abrir Docker, `npx supabase start` y regenerar.
- Docker Desktop se cierra cuando la computadora se suspende o se reinicia. Síntoma: "fetch failed" en el catálogo o pruebas de integración que fallan todas juntas. Abrir Docker y correr `npx supabase start`.
- Navegador integrado: con el panel oculto, el contenido que llega en partes no se dibuja y React no conecta los botones. Para revisar pantallas, mostrar el panel (y que la ventana de Claude no esté minimizada).
- Comercios de prueba: Alfa y Beta (publicados), Gamma (suspendido). Usuarios, UUID y contraseña local: ver el encabezado de `supabase/seed.sql`.

## Reglas de Diseño UI/UX y Desarrollo Frontend

1. **Jerarquía Visual y Estilo:**
   - Evita diseños genéricos de plantilla. Usa paletas de colores bien definidas con roles claros (Fondo, Superficie, Texto Primario, Texto Secundario y Acento).
   - Diseña pensando en dispositivos móviles primero (Mobile-First), priorizando la navegación táctil para el carrito de compras.

2. **Seguridad Multitenant (Supabase + RLS):**
   - Cada tabla o migración SQL debe incluir `tenant_id NOT NULL` y activar RLS desde el primer día.
   - Jamás expongas `service_role` en componentes del cliente.
   - Las políticas RLS deben consultar la pertenencia mediante funciones auxiliares seguras leyendo de `tenant_members`.

3. **Arquitectura Next.js:**
   - Prioriza React Server Components (RSC) para las vistas públicas del catálogo.
   - Los formularios de pedidos deben validar los precios en el servidor (usando Zod), nunca confiando en los datos enviados desde el navegador.
