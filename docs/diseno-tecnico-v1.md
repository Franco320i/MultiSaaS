# Diseño técnico v1: catálogos multitenant

Nov 6, 2026 · @Franco Almiron

> Copia exportada del documento original (https://claude.ai/artifact/XZeyeFibDtJQLo6LsJRhj2). El diagrama de arquitectura solo se ve en el original. Si cambia el diseño, se actualizan los dos.

## Resumen y principios de diseño

**La v1 es una sola aplicación Next.js en Vercel y un solo proyecto Supabase por entorno; el comercio se identifica por el host de la petición o por la membresía del usuario, y se aísla con `tenant_id`, claves foráneas compuestas y RLS, verificado por pruebas que bloquean el despliegue.** No hay microservicios, colas externas ni Redis. Los módulos futuros (IA, turnos, CRM, automatizaciones) se agregan como carpetas y tablas nuevas que leen el núcleo y la tabla `events`, sin tocar el catálogo.

`tuapp.com.ar` es un nombre provisorio para el dominio de la plataforma en todo el documento.

| # | Principio | Decisión concreta | Por qué |
| --- | --- | --- | --- |
| 1 | Una app, un despliegue | Catálogo público, panel del comercio, panel central y API viven en el mismo proyecto Next.js | Una persona mantiene un solo código, una sola versión y un solo pipeline |
| 2 | El comercio nunca lo dice el navegador | Catálogo: sale del host. Panel: sale de la ruta y se verifica contra `tenant_members`. Ningún endpoint acepta `tenant_id` del cliente | Es el error que más filtraciones produce en SaaS multitenant |
| 3 | Tres barreras independientes | El código filtra por `tenant_id`, RLS bloquea filas ajenas y las FK compuestas rechazan relaciones cruzadas | Si una falla (un bug, una política mal escrita), las otras dos contienen el daño |
| 4 | Clave secreta en lista cerrada | La clave `service_role` solo se usa en el panel central, la creación de pedidos, el alta de comercios y el cron; una regla de lint impide importarla en otro lado | Con esa clave RLS no actúa: cada uso es una superficie de riesgo que conviene poder enumerar |
| 5 | Público cacheable, privado nunca | El catálogo se sirve sin sesión ni cookies y se cachea por host; panel y admin son siempre dinámicos | Rendimiento barato sin riesgo de servir datos de un comercio o usuario a otro |
| 6 | Módulos por carpeta y prefijo | `catalog_*`, `orders_*` hoy; `bookings_*`, `crm_*`, `ai_*` mañana. Se comunican por `events`, no se importan entre sí | Un módulo nuevo no puede romper el catálogo porque no depende de él en tiempo de ejecución |
| 7 | Configuración, no código por cliente | Colores, plantilla, horarios y textos son datos en `tenant_settings` | Evita volver al modelo de "una app por cliente" |
| 8 | Cada tabla nace completa | Tabla, restricciones, índices, RLS, políticas y prueba de aislamiento en la misma migración y el mismo PR | Una tabla sin RLS en producción, aunque sea un día, es una filtración |

## 1. Arquitectura

**Tres puertas de entrada (catálogo, panel y panel central) llegan a la misma app Next.js; el proxy decide qué sección atender según el host y todos los datos viven en un único Postgres protegido por RLS.**

&#91;embedded content: arquitectura v1 · 3 tipos de usuario, 1 app, 1 base\]

Solo el panel central y las rutas de servidor (pedidos, subidas, cron) usan la clave secreta; todo lo demás llega a la base con la sesión del usuario o con la clave pública, y RLS actúa siempre.

| Pieza | Responsabilidad | Por qué así |
| --- | --- | --- |
| Proxy | Normalizar host, bloquear rutas internas, refrescar sesión solo en `app.` y `admin.`, reescribir | Un único punto decide qué sección ve cada host; sin consultas a la base para que sea rápido |
| Catálogo público | Mostrar el catálogo y el carrito | Sin sesión, por eso se puede cachear por host |
| Panel del comercio | Gestionar catálogo, pedidos y ajustes | La sesión del usuario hace que RLS actúe en cada consulta |
| Panel central | Administrar comercios, cobros y soporte | Aislado en su propio host, con MFA y auditoría |
| Rutas de servidor | Crear pedidos, procesar imágenes, tareas diarias | Son las únicas escrituras que no puede hacer el navegador directamente |
| Supabase | Auth, Postgres y Storage en un proyecto por entorno | Un solo lugar para migrar, respaldar y monitorear |

## 2. Estructura de carpetas

**El código se divide en tres capas con reglas de dependencia estrictas: `app/` (rutas) usa `modules/` y `core/`; `modules/` usa solo `core/` y `lib/`; ningún módulo importa a otro.** Las rutas son delgadas: validan, autorizan y llaman a funciones del módulo.

```
proyecto/
├─ src/
│  ├─ proxy.ts                      # (middleware.ts en Next ≤ 15) clasifica host y reescribe
│  ├─ app/
│  │  ├─ (marketing)/               # tuapp.com.ar: landing, precios, registro, legales
│  │  ├─ auth/                      # login, callback, recuperar contraseña, aceptar invitación
│  │  ├─ panel/                     # app.tuapp.com.ar (solo por reescritura)
│  │  │  ├─ page.tsx                # elegir comercio si el usuario tiene varios
│  │  │  └─ [tenant]/               # /burger/productos, /burger/pedidos, /burger/ajustes
│  │  ├─ admin/                     # admin.tuapp.com.ar (solo por reescritura)
│  │  ├─ sites/[host]/              # catálogo público (solo por reescritura)
│  │  └─ api/
│  │     ├─ orders/route.ts         # crear pedido (host del catálogo)
│  │     ├─ uploads/route.ts        # subir y procesar imágenes
│  │     └─ cron/daily/route.ts     # vencimientos (sin suspender) y limpieza
│  ├─ core/                         # núcleo compartido, sin UI de negocio
│  │  ├─ tenancy/                   # resolver host, requireTenantAccess, límites de plan
│  │  ├─ auth/                      # sesión, roles, permisos (can)
│  │  ├─ billing/                   # suscripciones, pagos, estados del comercio
│  │  ├─ domains/
│  │  ├─ audit/                     # escribir audit_log
│  │  ├─ events/                    # emitir y (futuro) consumir eventos
│  │  └─ admin/                     # servicios del panel central (único usuario de la clave secreta)
│  ├─ modules/
│  │  ├─ catalog/
│  │  │  ├─ queries.ts              # lecturas (públicas y del panel)
│  │  │  ├─ actions.ts              # server actions del panel
│  │  │  ├─ schemas.ts              # Zod
│  │  │  ├─ permissions.ts
│  │  │  ├─ cache.ts                # tags e invalidación del módulo
│  │  │  ├─ components/
│  │  │  └─ index.ts                # única puerta de entrada pública del módulo
│  │  └─ orders/                    # misma forma; incluye armado del mensaje de WhatsApp
│  ├─ lib/
│  │  ├─ supabase/
│  │  │  ├─ public.ts               # clave pública, sin cookies (catálogo)
│  │  │  ├─ server.ts               # sesión del usuario por petición (panel)
│  │  │  ├─ browser.ts
│  │  │  └─ service.ts              # clave secreta; import restringido por lint
│  │  ├─ cache/tags.ts              # único lugar donde se arman los tags
│  │  ├─ images/                    # validación, sharp, URL pública
│  │  ├─ rate-limit/
│  │  └─ env.ts                     # variables validadas con Zod al arrancar
│  ├─ ui/                           # componentes visuales sin lógica de negocio
│  └─ types/database.ts             # generado por Supabase CLI
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/                   # 20261110120000_core_tenants.sql, ..._catalog_products.sql
│  ├─ tests/                        # pgTAP: esquema y RLS
│  ├─ seed.sql                      # comercios Alfa y Beta, usuarios de prueba
│  └─ templates/                    # correos de Auth
├─ tests/
│  ├─ integration/                  # Vitest contra Supabase local
│  └─ e2e/                          # Playwright con *.localhost
├─ docs/
│  ├─ decisions/                    # un archivo por decisión (ADR)
│  └─ runbooks/                     # alta asistida, suspensión, restaurar backup, rotar claves
└─ .github/workflows/
```

| Decisión | Justificación |
| --- | --- |
| `panel/`, `admin/` y `sites/` solo accesibles por reescritura | El proxy devuelve 404 si alguien pide esas rutas directamente; cada host ve solo su sección |
| Comercio en la ruta del panel (`/burger/...`) y no en una cookie "comercio activo" | Es explícito, se puede compartir y se verifica en cada petición; un usuario con dos comercios no mezcla pestañas |
| `core/` separado de `modules/` | El núcleo cambia poco y lo usan todos; los módulos se pueden agregar o apagar sin tocarlo |
| Fronteras impuestas con ESLint (`no-restricted-imports` o `eslint-plugin-boundaries`) | Las reglas escritas se olvidan; las de lint fallan en CI, también con código generado por IA |
| `server-only` en `lib/supabase/service.ts`, `core/` y `actions.ts` | Si algo del servidor termina importado en un componente de cliente, la compilación falla |
| SQL en `supabase/migrations/` con prefijo de módulo en el nombre | La CLI de Supabase exige una carpeta; el prefijo mantiene el orden por módulo legible |
| `docs/decisions` y `docs/runbooks` | Con 100+ comercios, los procedimientos repetidos (suspender, restaurar) tienen que estar escritos |

## 3 y 4. Tablas, relaciones, índices y restricciones

**La v1 tiene 24 tablas: 19 del núcleo y 5 de los módulos de catálogo y pedidos; toda tabla de un comercio lleva `tenant_id not null`, una restricción única `(tenant_id, id)` y claves foráneas compuestas hacia sus padres.** Así la propia base rechaza un producto de Alfa en una categoría de Beta, aunque el código y RLS fallaran.

### Convenciones para todas las tablas

| Tema | Decisión | Por qué |
| --- | --- | --- |
| Identificadores | `uuid` con `gen_random_uuid()`; `bigint generated always as identity` solo en `events` y `audit_log` | Los UUID no revelan cuántos comercios o pedidos hay ni se pueden adivinar |
| Estados y tipos | `text` + `CHECK (col in (...))`, no `enum` de Postgres | Agregar o quitar un valor es una migración trivial; con `enum` quitar un valor es difícil |
| Dinero | `bigint` en centavos; moneda en `tenant_settings.currency` | Sin errores de redondeo en JavaScript; `numeric` llega como texto y `float` pierde precisión |
| Fechas | `timestamptz`; `created_at` y `updated_at` con trigger `private.set_updated_at()` | Una sola zona de verdad (UTC) y la zona del comercio se aplica al mostrar |
| Textos | `CHECK (char_length(...) between ...)` en nombres, descripciones y notas | El límite vive en la base, no solo en el formulario |
| Slugs y hosts | `text` con `CHECK (col = lower(col))` y expresión regular | Evita duplicados por mayúsculas sin depender de la extensión `citext` |
| `tenant_id` | Primera columna, `not null`, FK a `tenants(id) on delete cascade`, inmutable por trigger `private.prevent_tenant_change()` | Ninguna fila puede cambiarse de comercio por un `UPDATE` |
| Índices | Todo índice de búsqueda empieza por `tenant_id` | Las consultas siempre filtran por comercio; con 500 comercios el índice descarta el 99,8 % de las filas de entrada |
| Unicidad | Siempre `(tenant_id, ...)` salvo `tenants.slug` y `domains.hostname` | Dos comercios pueden tener la categoría "Promos"; solo la dirección es global |
| Borrado | Comercios: nunca `DELETE` en v1, se pasan a `cancelled`. Productos y categorías: borrado real, porque los pedidos guardan una copia | Los pedidos no dependen de que el producto siga existiendo |
| Esquemas | `public` para tablas expuestas por la API; `private` para funciones auxiliares y tablas internas | Lo que está en `private` no se puede llamar desde la API de Supabase |

### Núcleo: comercios, usuarios y acceso

| Tabla | Columnas | Claves y restricciones | Índices |
| --- | --- | --- | --- |
| `tenants` | `id`, `slug`, `name`, `business_type` → `business_templates`, `status`, `trial_ends_at`, `published_at`, `status_reason`, `created_at`, `updated_at` | `slug` único, 3–40 caracteres `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, no empieza por `xn--`, no figura en `reserved_slugs` (trigger). `status in ('trial','active','past_due','suspended','cancelled')` | `unique(slug)`, `(status)` |
| `profiles` | `id` = `auth.users.id`, `full_name`, `phone`, `created_at` | FK a `auth.users on delete cascade`; se crea con trigger al registrarse | PK |
| `tenant_members` | `tenant_id`, `user_id`, `role`, `invited_by`, `created_at` | PK `(tenant_id, user_id)`; `role in ('owner','staff')`; índice único parcial `(tenant_id) where role = 'owner'` = un solo dueño | `(user_id)` para resolver "mis comercios" |
| `tenant_invitations` | `id`, `tenant_id`, `email`, `role`, `token_hash`, `invited_by`, `expires_at`, `accepted_at`, `revoked_at`, `created_at` | `role in ('owner','staff') (las de owner solo las crea el panel central)`; `token_hash` único (se guarda el SHA-256, el token viaja solo en el correo); único parcial `(tenant_id, email)` donde no está aceptada ni revocada | `(tenant_id, created_at desc)` |
| `platform_admins` | `user_id`, `role`, `created_by`, `created_at` | PK `user_id`; `role in ('superadmin','support')`; se carga solo por SQL, sin pantalla | PK |
| `reserved_slugs` | `slug` | PK. Precargada: `www`, `app`, `admin`, `api`, `mail`, `staging`, `static`, `cdn`, `ayuda`, `soporte`, `blog`, `status`, `docs` | PK |
| `domains` | `id`, `tenant_id`, `hostname`, `kind`, `is_primary`, `status`, `verification`, `verified_at`, `created_at` | `hostname` único global, minúsculas, sin puerto. `kind in ('subdomain','custom')`, `status in ('pending','active','failed')`. Único parcial `(tenant_id) where is_primary` | `unique(hostname)`, `(tenant_id)` |

### Núcleo: planes, cobro y módulos

| Tabla | Columnas | Claves y restricciones | Índices |
| --- | --- | --- | --- |
| `plans` | `id` (`'base'`, `'pro'`), `name`, `price_ars`, `max_products`, `max_members`, `max_images_per_product`, `custom_domain`, `remove_branding`, `is_public`, `sort` | Límites como columnas tipadas, no `jsonb`: los triggers y RLS los leen sin parsear; `null` en `max_products` = ilimitado | PK |
| `subscriptions` | `id`, `tenant_id`, `plan_id`, `status`, `provider`, `provider_ref`, `current_period_start`, `current_period_end`, `created_at`, `updated_at` | `status in ('trialing','active','past_due','cancelled')`; `provider in ('manual','mercadopago')`; único parcial `(tenant_id) where status <> 'cancelled'` = una suscripción vigente | `(tenant_id)`, `(status, current_period_end)` para el cron |
| `billing_payments` | `id`, `tenant_id`, `subscription_id`, `amount`, `paid_at`, `method`, `reference`, `notes`, `recorded_by`, `created_at` | FK compuesta `(tenant_id, subscription_id)`; `amount > 0`; `method in ('mp_link','transfer','cash','other')` | `(tenant_id, paid_at desc)` |
| `modules` | `key`, `name`, `description`, `is_available`, `sort` | PK `key` (`catalog`, `orders`; luego `bookings`, `crm`, `ai`, `automations`) | PK |
| `tenant_modules` | `tenant_id`, `module_key`, `enabled`, `config`, `enabled_at`, `updated_at` | PK `(tenant_id, module_key)`; FK a `modules`; `config` es `jsonb` validado con Zod | PK |
| `business_templates` | `key`, `name`, `default_theme`, `default_categories`, `is_active` | Rubros: `gastronomia`, `indumentaria`, `tecnologia`, `dietetica`, `general` | PK |
| `tenant_settings` | `tenant_id`, `display_name`, `tagline`, `description`, `logo_path`, `cover_path`, `theme`, `template_key`, `whatsapp_phone`, `instagram`, `address`, `city`, `currency`, `timezone`, `accepts_pickup`, `accepts_delivery`, `delivery_fee`, `min_order_amount`, `open_mode`, `closed_message`, `updated_at` | PK `tenant_id`. `whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'` (E.164). Rutas de imágenes deben empezar con \`tenant\_id |  |
| `business_hours` | `id`, `tenant_id`, `weekday`, `opens_at`, `closes_at` | `weekday between 0 and 6`; `opens_at <> closes_at`; si `closes_at < opens_at` cruza la medianoche | `(tenant_id, weekday)` |

### Núcleo: registro, eventos y control

| Tabla | Columnas | Claves y restricciones | Índices |
| --- | --- | --- | --- |
| `events` | `id`, `tenant_id`, `type`, `entity_type`, `entity_id`, `payload`, `actor_kind`, `actor_id`, `occurred_at` | `type ~ '^[a-z_]+\.[a-z_]+$'` (`order.created`, `tenant.published`); solo inserción; `payload` lleva IDs, no datos personales | `(tenant_id, occurred_at desc)`, `(type, occurred_at)` |
| `audit_log` | `id`, `tenant_id`, `actor_user_id`, `actor_kind`, `action`, `target_type`, `target_id`, `changes`, `reason`, `ip`, `user_agent`, `created_at` | Sin FK a `tenants` para que sobreviva a una purga; `actor_kind in ('platform_admin','owner','staff','system')`; trigger que impide `UPDATE` y `DELETE` | `(tenant_id, created_at desc)`, `(actor_user_id, created_at desc)` |
| `tenant_counters` | `tenant_id`, `name`, `value` | PK `(tenant_id, name)`; numeración de pedidos por comercio (#1, #2...) sin huecos visibles | PK |
| `rate_limits` | `key`, `window_start`, `hits` | PK `(key, window_start)`; tabla `unlogged` (perder contadores en un reinicio es aceptable); limpieza horaria | PK |

### Módulo catálogo

| Tabla | Columnas | Claves y restricciones | Índices |
| --- | --- | --- | --- |
| `catalog_categories` | `id`, `tenant_id`, `name`, `slug`, `description`, `position`, `is_visible`, `created_at`, `updated_at` | `unique(tenant_id, id)`, `unique(tenant_id, slug)`; nombre 1–60 caracteres | `(tenant_id, position)` |
| `catalog_products` | `id`, `tenant_id`, `category_id`, `name`, `slug`, `description`, `price`, `compare_at_price`, `is_published`, `is_available`, `is_featured`, `position`, `created_at`, `updated_at` | `unique(tenant_id, id)`, `unique(tenant_id, slug)`; `price >= 0`; `compare_at_price is null or compare_at_price > price`. **FK `(tenant_id, category_id)` → `catalog_categories(tenant_id, id) on delete set null (category_id)`**: al borrar la categoría solo se anula `category_id`, nunca `tenant_id` (Postgres 15+) | `(tenant_id, category_id, position)`; parcial `(tenant_id, position) where is_published` |
| `catalog_product_images` | `id`, `tenant_id`, `product_id`, `storage_path`, `width`, `height`, `position`, `alt`, `created_at` | `unique(tenant_id, id)`; `storage_path` único y \`CHECK (storage\_path like tenant\_id::text |  |

### Módulo pedidos

| Tabla | Columnas | Claves y restricciones | Índices |
| --- | --- | --- | --- |
| `orders` | `id`, `tenant_id`, `number`, `status`, `fulfillment`, `customer_name`, `customer_phone`, `delivery_address`, `notes`, `subtotal`, `delivery_fee`, `total`, `channel`, `idempotency_key`, `client_ip_hash`, `created_at`, `updated_at`, `status_changed_at` | `unique(tenant_id, id)`, `unique(tenant_id, number)`, `unique(tenant_id, idempotency_key)`; `status in ('new','confirmed','preparing','ready','completed','cancelled')`; `fulfillment in ('pickup','delivery')`; `total = subtotal + delivery_fee`; si es envío, `delivery_address` obligatoria; notas ≤ 500 | `(tenant_id, created_at desc)`, `(tenant_id, status, created_at desc)` |
| `order_items` | `id`, `tenant_id`, `order_id`, `product_id`, `product_name`, `unit_price`, `quantity`, `options`, `line_total`, `position` | FK `(tenant_id, order_id)` → `orders on delete cascade`; FK `(tenant_id, product_id)` → `catalog_products on delete set null (product_id)`; `quantity between 1 and 99`; `options` es un arreglo `jsonb` (vacío en v1) | `(tenant_id, order_id)` |

El pedido guarda nombre y precio de cada producto en el momento de la compra: si el comercio cambia el precio o borra el producto, el historial no cambia. `options` queda listo para adicionales y variantes sin migrar pedidos viejos.

### Relaciones principales

- `tenants` 1–N `tenant_members`, `domains`, `subscriptions`, `tenant_modules`, `business_hours`, `catalog_*`, `orders`, `events`; 1–1 `tenant_settings`.
- `auth.users` 1–1 `profiles`; 1–N `tenant_members`; 0–1 `platform_admins`.
- `catalog_categories` 1–N `catalog_products` 1–N `catalog_product_images` (todas por `(tenant_id, id)`).
- `orders` 1–N `order_items` N–1 `catalog_products` (opcional, por `(tenant_id, product_id)`).
- `plans` 1–N `subscriptions` 1–N `billing_payments`; `modules` 1–N `tenant_modules`.

### Límites de plan en la base

Un trigger `before insert` en `catalog_products`, `catalog_product_images` y `tenant_invitations` compara con el plan de la suscripción vigente y rechaza si se supera. El servidor valida antes para mostrar un mensaje claro; el trigger es la garantía.

## 5. Políticas RLS

**RLS está activado en las 24 tablas; los compradores anónimos solo leen catálogo publicado de comercios visibles, los miembros solo ven su comercio, y nadie escribe pedidos, suscripciones ni eventos desde el navegador.** El superadministrador no tiene políticas propias: opera desde el servidor con la clave secreta, siempre auditado.

### Funciones auxiliares (esquema `private`, no expuesto por la API)

| Función | Devuelve | Uso |
| --- | --- | --- |
| `private.my_tenant_ids(roles text[])` | Conjunto de `tenant_id` donde `auth.uid()` es miembro con alguno de esos roles | Base de casi todas las políticas: `tenant_id in (select private.my_tenant_ids('{owner,staff}'))` |
| `private.tenant_is_public(tenant uuid)` | `true` si `status in ('trial','active','past_due')` y `published_at is not null` | Lectura anónima del catálogo |
| `public.storefront_by_host(host text)` | Solo campos públicos del comercio: id, nombre, configuración, horarios, estado de visibilidad | Única forma anónima de resolver un host; evita dar `SELECT` sobre `tenants` y `domains` |
| `public.slug_available(slug text)` | `boolean` | Verificación en vivo durante el registro, sin exponer la lista de comercios |
| `public.accept_invitation(token text)` | `tenant_id` | Crea la membresía si el token es válido y no se supera el límite del plan |

Todas son `security definer`, `stable` cuando corresponde y con `set search_path = ''`. Por qué: leen `tenant_members` sin quedar atrapadas por su propia RLS, el `search_path` vacío impide que alguien las engañe con objetos homónimos, y el patrón `in (select ...)` hace que Postgres evalúe la membresía una vez por consulta y no una vez por fila.

### Reglas de escritura de políticas

1. Una política por operación y por rol (`for select to anon`, `for update to authenticated`); nunca `for all`.
2. Toda política de `update` lleva `using` y `with check` con la misma condición de comercio, para que nadie mueva una fila a otro comercio.
3. Nunca se usa `user_metadata` ni `raw_user_meta_data`: el usuario puede editarlos.
4. Las vistas se crean con `security_invoker = true`; las funciones `security definer` en `public` están en una lista cerrada que verifica una prueba.
5. Además de RLS, se revoca `insert/update/delete` a `anon` en todas las tablas y se revoca todo en las tablas internas.

### Políticas por tabla

| Tabla | Anónimo | Staff | Dueño | Escrituras fuera de RLS |
| --- | --- | --- | --- | --- |
| `tenants` | Nada (usa `storefront_by_host`) | Leer su comercio | Leer su comercio | Alta, estado y slug: funciones del servidor |
| `profiles` | Nada | Leer el propio y los de su comercio; editar el propio | Igual | Creación por trigger |
| `tenant_members` | Nada | Leer miembros de su comercio | Leer; borrar staff (no a sí mismo) | Alta por `accept_invitation`; cambio de dueño desde el panel central |
| `tenant_invitations` | Nada | Nada | Leer, crear (`role = 'staff'`), revocar | Aceptación por `accept_invitation` |
| `platform_admins` | Nada | Leer su propia fila | Leer su propia fila | Solo SQL manual |
| `reserved_slugs`, `plans`, `modules`, `business_templates` | Leer | Leer | Leer | Migraciones |
| `domains` | Nada | Leer | Leer | Panel central |
| `subscriptions`, `billing_payments` | Nada | Nada | Leer | Panel central y cron |
| `tenant_modules` | Nada | Leer | Leer | Panel central y alta |
| `tenant_settings` | Nada (usa `storefront_by_host`) | Leer | Leer y editar | Alta |
| `business_hours` | Nada (usa `storefront_by_host`) | Leer | Leer, crear, editar, borrar | — |
| `catalog_categories` | Leer si `is_visible` y comercio público | Leer, crear, editar, borrar | Igual que staff | — |
| `catalog_products` | Leer si `is_published` y comercio público | Leer, crear, editar, borrar | Igual que staff | — |
| `catalog_product_images` | Leer si el producto está publicado y el comercio es público | Leer, crear, editar, borrar | Igual que staff | — |
| `orders` | Nada | Leer; editar `status` y notas internas | Igual que staff | Creación por `private.create_order` |
| `order_items` | Nada | Leer | Leer | Creación por `private.create_order` |
| `events` | Nada | Nada | Nada en v1 | Triggers y funciones |
| `audit_log` | Nada | Nada | Leer lo de su comercio (ve cuándo entró soporte) | Servidor y funciones |
| `tenant_counters`, `rate_limits` | Nada | Nada | Nada | Solo funciones internas |

"Nada" significa RLS activado sin ninguna política para ese rol: la base devuelve cero filas o rechaza la escritura.

### Storage (`storage.objects`)

| Bucket | Anónimo | Staff y dueño |
| --- | --- | --- |
| `catalog-public` | Sin política de lectura: las fotos se sirven por URL pública, pero nadie puede listar el bucket | Leer, subir, reemplazar y borrar solo si la primera carpeta de la ruta es un `tenant_id` de `my_tenant_ids` |
| `tenant-private` (preparado) | Nada | Leer y subir en su carpeta; entrega con URL firmada de 60 segundos |

La lectura para miembros hace falta porque la API de Storage consulta el objeto antes de reemplazarlo o borrarlo.

## 6. Autenticación, roles y permisos

**Supabase Auth autentica a dueños, staff y superadministradores; la autorización se decide siempre en el servidor con la tabla `tenant_members` y se repite en RLS.** Los compradores no tienen cuenta.

### Tipos de usuario

| Usuario | Identidad | Dónde opera | Sesión |
| --- | --- | --- | --- |
| Comprador | Anónimo | `[slug].tuapp.com.ar` | Ninguna; el carrito vive en `localStorage` del navegador |
| Dueño (`owner`) | Supabase Auth, email y contraseña | `app.tuapp.com.ar/[slug]` | Cookie solo de `app.tuapp.com.ar` |
| Staff (`staff`) | Igual, por invitación | `app.tuapp.com.ar/[slug]` | Igual |
| Superadmin y soporte | Supabase Auth + fila en `platform_admins` + MFA TOTP | `admin.tuapp.com.ar` | Cookie solo de `admin.tuapp.com.ar`; exige nivel `aal2` |

### Decisiones de sesión

| Decisión | Por qué |
| --- | --- |
| Cookies sin atributo `Domain` (atadas al host exacto) | Los subdominios de catálogos nunca reciben la sesión del panel; una sesión del panel no sirve en el admin |
| `@supabase/ssr` y en el servidor `auth.getUser()` (o `getClaims()` con claves asimétricas) en cada acción | `getSession()` en el servidor confía en la cookie sin verificarla |
| El proxy refresca la sesión solo en `app.` y `admin.` | El catálogo queda sin cookies y por eso cacheable |
| Confirmación de email obligatoria, contraseña mínima de 10 caracteres, protección contra contraseñas filtradas (Pro), SMTP propio con Resend | Evita cuentas falsas y que los correos de Auth caigan en spam |
| MFA opcional para dueños y obligatorio para `platform_admins` | Una cuenta de superadmin comprometida expone todos los comercios |
| Sin Custom Access Token Hook en v1 | La consulta a `tenant_members` es barata y siempre está al día; un claim en el token sigue valiendo hasta que expira aunque hayas quitado al usuario |

### Cómo se autoriza cada acción del panel

1. La ruta `/[tenant]/...` o la server action llama a `requireTenantAccess(slug, permiso)`.
2. Esa función obtiene el usuario verificado, busca el comercio por slug y la fila en `tenant_members`; si no hay fila responde 404 (no 403, para no confirmar que el comercio existe).
3. Compara el rol con el permiso pedido usando el mapa `can(rol, permiso)` de `core/auth`.
4. Devuelve `tenantId`; las consultas filtran `.eq('tenant_id', tenantId)` y RLS vuelve a filtrar.

Las server actions son endpoints públicos aunque no tengan URL visible: por eso el paso 1 va dentro de cada acción y no solo en el layout.

### Matriz de permisos

| Permiso | Staff | Dueño | Soporte | Superadmin |
| --- | --- | --- | --- | --- |
| Ver panel, catálogo y pedidos | Sí | Sí | Sí, solo lectura y auditado | Sí, auditado |
| Crear y editar productos, categorías e imágenes | Sí | Sí | No | Sí, auditado |
| Cambiar estado de pedidos | Sí | Sí | No | No |
| Editar marca, horarios, WhatsApp y entrega | No | Sí | No | Sí, auditado |
| Publicar o despublicar el catálogo | No | Sí | No | Sí, auditado |
| Invitar y quitar staff | No | Sí | No | Sí, auditado |
| Ver plan y pagos | No | Sí | Sí | Sí |
| Cambiar plan, registrar pagos, suspender | No | No | No | Sí, con motivo |
| Transferir la propiedad del comercio | No | No | No | Sí, con motivo |

Cuatro roles alcanzan. Los permisos viven en código como un mapa constante y se reflejan en RLS; una tabla `role_permissions` queda para cuando un cliente pida roles a medida.

Un usuario puede pertenecer a varios comercios (por ejemplo, alguien que administra dos locales); `/panel` le muestra la lista y cada pestaña trabaja sobre el comercio de su URL.

## 7. Resolución de comercios por subdominio

**El proxy de Next.js solo lee el host y reescribe la ruta, sin consultar la base; la página del catálogo resuelve host → comercio con una función cacheada por host.** Así cada visita no paga una consulta extra y un host desconocido termina en un 404 cacheado.

### Mapa de hosts

| Host | Qué sirve | Ruta interna | Sesión |
| --- | --- | --- | --- |
| `tuapp.com.ar` (y `www.` redirige al dominio raíz) | Landing, precios, registro, legales | `/(marketing)` | No |
| `app.tuapp.com.ar` | Panel del comercio | `/panel/...` | Sí |
| `admin.tuapp.com.ar` | Panel central | `/admin/...` | Sí + `aal2` |
| `[slug].tuapp.com.ar` | Catálogo | `/sites/[host]/...` | No |
| Dominio propio (preparado) | Catálogo | `/sites/[host]/...` | No |

### Pasos en cada petición

1. **Normalizar el host:** minúsculas, sin puerto, sin punto final; rechazar caracteres inválidos y longitudes mayores a 253.
2. **Bloquear accesos directos:** si la ruta original empieza con `/sites`, `/panel` o `/admin`, responder 404. Esas rutas solo existen por reescritura.
3. **Clasificar** comparando con `ROOT_DOMAIN` (producción `tuapp.com.ar`, staging `staging.tuapp.com.ar`, local `localhost`).
4. **Catálogo:** reescribir a `/sites/{host}{ruta}`. No se toca la sesión ni se setean cookies.
5. **Panel y admin:** refrescar la sesión de Supabase y reescribir.
6. **En la página:** `getStorefront(host)` llama a `storefront_by_host`, cacheado con el tag `host:{host}`. Sin resultado → 404. Comercio suspendido o sin publicar → página "Catálogo no disponible".

### Decisiones

| Decisión | Por qué |
| --- | --- |
| El host va dentro de la ruta (`/sites/[host]`) | La caché de Next y de Vercel queda separada por comercio de forma estructural, no por disciplina del programador |
| Sin base de datos en el proxy | Corre en cada petición, incluidos recursos estáticos; meter una consulta ahí suma latencia y costo a todo |
| `tenants.slug` y `domains.hostname` separados | El slug identifica al comercio en el panel; `domains` permite sumar dominios propios y redirecciones sin tocar `tenants` |
| Slug: 3–40 caracteres, sin `xn--`, fuera de `reserved_slugs` | Evita conflictos con `app`, `admin` o `api` y nombres engañosos con caracteres internacionales |
| Cambiar el slug solo desde el panel central | Romper el link que el comercio ya compartió en Instagram es un problema de soporte |
| 404 de hosts desconocidos cacheados 60 s y reglas de firewall de Vercel | Un bot que prueba subdominios al azar no puede convertir eso en carga sobre la base |

### DNS y entorno local

- **Producción:** registro comodín `*.tuapp.com.ar` apuntado a Vercel. Para emitir un certificado comodín, Vercel pide que el dominio use sus nameservers (verificalo al configurar). Recomiendo delegar el DNS del dominio de la plataforma a Vercel y usar Cloudflare solo para Turnstile; esto corrige lo que sugería el análisis de viabilidad.
- **Local:** los navegadores resuelven `*.localhost` sin tocar el archivo hosts: `alfa.localhost:3000`, `app.localhost:3000`, `admin.localhost:3000`.
- **Dominio propio (preparado):** fila en `domains` con `kind = 'custom'` y `status = 'pending'` → alta por API de Vercel → el comercio crea un CNAME → verificación → `active` e invalidación del tag. La tabla y el flujo de resolución ya lo soportan; falta solo la pantalla y la llamada a la API.

## 8. Almacenamiento de imágenes

**Las fotos se achican en el navegador, el servidor las vuelve a procesar con `sharp` a WebP en dos tamaños y las guarda en un bucket público bajo la carpeta del `tenant_id`; en la base se guarda la ruta, nunca la URL.** No se usan las transformaciones pagas de Supabase ni la optimización de imágenes de Vercel.

### Buckets

| Bucket | Público | Contenido | Tipos y tamaño | Estado |
| --- | --- | --- | --- | --- |
| `catalog-public` | Sí | Fotos de productos, logos y portadas | Solo `image/webp`, máximo 2 MB por archivo (configurado en el bucket) | v1 |
| `tenant-private` | No | Importaciones, comprobantes, adjuntos futuros | Según uso; URL firmada de 60 s | Preparado |

### Rutas

- Producto: `{tenant_id}/products/{product_id}/{image_id}-480.webp` y `...-1280.webp`
- Marca: `{tenant_id}/branding/logo-{uuid}.webp`, `{tenant_id}/branding/cover-{uuid}.webp`

Se usa `tenant_id` y no el slug porque el slug puede cambiar. Los nombres incluyen un UUID nuevo en cada subida: el archivo nunca cambia, así se cachea un año sin riesgo de servir una versión vieja.

### Flujo de subida

1. **Navegador:** acepta JPEG, PNG o WebP de hasta 15 MB, lo achica a 2000 px de lado mayor y lo convierte a WebP. Resultado típico: menos de 1 MB, por debajo del límite de cuerpo de las funciones de Vercel (4,5 MB, verificar).
2. **`POST /api/uploads`:** verifica sesión y `requireTenantAccess`, que el producto sea del comercio y el límite de imágenes del plan.
3. **Servidor con `sharp`:** detecta el formato real por los primeros bytes (no por extensión), rechaza imágenes de más de 40 megapíxeles, corrige la rotación, elimina metadatos (incluida la ubicación GPS de la foto) y genera 480 px y 1280 px en WebP.
4. **Storage:** sube con el cliente de la sesión del usuario, de modo que las políticas de la carpeta también se aplican; `cacheControl` de un año.
5. **Base:** inserta `catalog_product_images`; si falla, borra los archivos recién subidos.
6. **Caché:** invalida el tag del catálogo del comercio.

Re-codificar en el servidor garantiza que lo que se publica es una imagen limpia generada por nosotros, aunque alguien manipule el paso 1. Si un miembro sube directo a Storage salteándose el servidor, solo puede escribir WebP de hasta 2 MB en su propia carpeta.

### Borrado, límites y migración futura

| Tema | v1 | Más adelante |
| --- | --- | --- |
| Borrar una foto o un producto | Se borra la fila y luego los archivos | Barrido nocturno de archivos huérfanos |
| Límite de fotos | Por plan: Base 3 por producto, Pro 8 (trigger + servidor) | Cuota total de MB por comercio |
| URL pública | `publicImageUrl(path, size)` arma la URL desde `NEXT_PUBLIC_IMAGES_BASE_URL` | Pasar a Cloudflare R2 + CDN cambiando esa variable y copiando los objetos, sin migrar la base |
| `next/image` | Con `unoptimized` o un loader propio que elige 480 o 1280 | — |

## 9. Panel central de superadministrador

**El panel central vive en `admin.tuapp.com.ar`, exige fila en `platform_admins` y MFA, y toda acción que cambia datos pasa por una función de Postgres que escribe el cambio y su registro en `audit_log` en la misma transacción.** No existe "iniciar sesión como el comercio".

### Cómo funciona por dentro

1. El layout de `/admin` verifica usuario, fila en `platform_admins` y nivel `aal2`; si falta algo, 404.
2. Las lecturas usan el cliente con clave secreta desde `core/admin`, siempre con `tenant_id` explícito.
3. Las escrituras llaman funciones `private.admin_*` (por ejemplo `admin_set_tenant_status(actor, tenant, estado, motivo)`), que validan, cambian y auditan juntas. Sin motivo, la acción se rechaza.
4. Cada acción también emite su evento (`tenant.suspended`, `subscription.paid`) para automatizaciones futuras.

### Pantallas

| Pantalla | Qué permite | Estado |
| --- | --- | --- |
| Comercios | Buscar por nombre, slug o teléfono; filtrar por estado, plan y vencimiento; columnas: estado, plan, alta, vence, productos, pedidos de 30 días, último ingreso | v1 |
| Ficha del comercio | Datos, miembros, dominios, módulos, suscripción, pagos, auditoría y eventos recientes | v1 |
| Alta asistida | Crear comercio con la misma función del autoservicio e invitar al dueño por email | v1 |
| Cobros | Registrar pago manual, extender vencimiento, cambiar plan | v1 |
| Estado | Suspender, reactivar o cancelar con motivo | v1 |
| Modo soporte | Ver el panel del comercio en solo lectura con una franja visible; editar catálogo y ajustes como soporte, auditado | v1 |
| Auditoría global | Quién hizo qué, filtrable por comercio y por actor | v1 |
| Resumen | Comercios por estado, altas por semana, pedidos de 7 días, vencimientos de los próximos 7 días | v1 |
| Alertas de salud | Sin productos publicados, sin pedidos en 14 días, prueba por vencer sin pago | v1 (como filtros) |
| Acciones masivas, planes, módulos y plantillas desde pantalla | Hoy se cambian por migración | Preparado |

### Por qué así

| Decisión | Por qué |
| --- | --- |
| Modo soporte en vez de suplantar al usuario | Suplantar implica emitir un token del cliente: si se filtra, da acceso como él, y la auditoría atribuye tus cambios al dueño |
| Escritura en funciones de Postgres con auditoría en la misma transacción | No puede existir un cambio sin su registro, aunque el servidor falle a mitad de camino |
| El dueño ve en su panel cuándo entró soporte | Transparencia: genera confianza y te protege ante reclamos |
| Listas paginadas en el servidor, filtros por estado y vencimiento | Con 500 comercios no se puede revisar una tabla entera; se trabaja por excepciones |
| Sin pantalla para crear superadmins | Agregar un administrador es raro y debe pasar por SQL revisado, no por un clic |

### Trabajo automático diario

Un cron de Vercel llama una vez por día a `/api/cron/daily`, protegido con `CRON_SECRET`. Pasa a `past_due` lo vencido sin pago (el catálogo sigue visible) y limpia límites de frecuencia viejos y fotos huérfanas. La transición la ejecuta una función de Postgres idempotente: correrla dos veces no cambia el resultado.

**Cambio del 2026-11-21 (etapa 10d, ver `docs/decisions/0005-avisos-y-errores.md`):** con cobro manual, la tarea diaria **nunca suspende sola** (suspender es una acción del panel central, con motivo) y **no se envían correos**: ni avisos de prueba por vencer a los comercios ni resumen diario. Lo vencido y lo atrasado se ve en el panel central (Resumen y filtros "Pruebas que vencen en 7 días" y "Pago pendiente"). Los errores de la app llegan por Sentry.

## 10. Flujo desde el registro hasta el catálogo en uso

**Un comercio queda operativo en una sola transacción de base de datos (`private.provision_tenant`) y se publica cuando tiene WhatsApp y al menos un producto publicado; el mismo camino sirve para el alta por autoservicio y para el alta asistida que hacés vos.**

### Alta por autoservicio

1. **Registro** en `tuapp.com.ar/registro`: solo email, contraseña y Turnstile. Supabase envía el correo de confirmación por Resend.
2. **Confirmación:** el enlace vuelve a `app.tuapp.com.ar/auth/callback` y crea la sesión. Un usuario sin comercios va al asistente.
3. **Asistente, paso 1 "Tu comercio":** nombre, slug con verificación en vivo (`slug_available`), rubro y WhatsApp. Al confirmar, una server action llama a `private.provision_tenant`, que en una sola transacción crea:
   - `tenants` en `trial`, con `trial_ends_at` a 14 días;
   - `tenant_members` con el usuario como `owner`;
   - `domains` con `[slug].tuapp.com.ar` como principal y activo;
   - `tenant_settings` con los valores de la plantilla del rubro;
   - `tenant_modules` con `catalog` y `orders`;
   - `subscriptions` en `trialing` sobre el plan Base;
   - categorías iniciales del rubro (por ejemplo, Hamburguesas, Bebidas, Postres);
   - el evento `tenant.created` y su registro de auditoría.
4. **Paso 2 "Tu marca":** logo, portada y colores dentro de la paleta de la plantilla.
5. **Paso 3 "Horarios y entrega":** horarios por día, retiro y/o envío, costo de envío, pedido mínimo.
6. **Paso 4 "Productos":** carga manual o pegado desde una planilla (columnas categoría, nombre, descripción, precio) con vista previa y errores por fila.
7. **Publicar:** vista previa del catálogo real; al publicar se completa `published_at`, se emite `tenant.published` y se invalida la caché. La pantalla final muestra el link, un código QR y botones para compartir.
8. **Uso diario:** el comercio pone el link en Instagram y WhatsApp; los pedidos llegan al panel y a su WhatsApp. El inicio del panel muestra una lista de pendientes (logo, horarios, 5 productos con foto).

Los datos del paso 3 no se guardan en los metadatos del usuario: se piden después de confirmar el email, así no hay comercios creados por cuentas falsas ni datos de alta en un lugar que el usuario puede editar.

Si la transacción del paso 3 falla, no queda nada a medias. Si el usuario vuelve a enviar el formulario, la función detecta que ya es dueño de un comercio y retoma el asistente.

### Alta asistida (tu modelo de venta inicial)

1. Desde el panel central creás el comercio con `provision_tenant` y el email del dueño; la membresía queda como invitación de tipo dueño.
2. Cargás marca, horarios y productos en modo soporte.
3. El dueño recibe un email "Tu catálogo está listo", define su contraseña y entra a un panel ya cargado.

### Ciclo de vida del comercio

| Estado | Catálogo público | Panel del dueño | Pasa a |
| --- | --- | --- | --- |
| `trial` | Visible si está publicado | Completo, con aviso de días restantes | `active` al registrarse un pago; `past_due` al vencer sin pago |
| `active` | Visible | Completo | `past_due` al vencer el período sin pago |
| `past_due` | Visible | Completo, con aviso de pago | `active` con pago; `suspended` solo a mano desde el panel central (desde el 2026-11-21 no hay suspensión automática) |
| `suspended` | "Catálogo no disponible" | Solo lectura, con aviso y link de pago | `active` con pago; `cancelled` a pedido o a los 90 días |
| `cancelled` | 404 | Sin acceso | Purga manual de datos según política publicada |

En v1 el pago se hace con un link de Mercado Pago y vos lo registrás en el panel central; la suscripción automática por webhook entra cuando tengas 20–30 clientes.

## 11. Pedidos y conexión con WhatsApp

**El pedido se guarda primero en la base, con precios recalculados en el servidor, y recién después se abre WhatsApp con un mensaje que arma el servidor; en v1 no se usa la API oficial de WhatsApp.** El navegador manda solo IDs y cantidades; nunca precios ni `tenant_id`.

### Flujo de un pedido

1. **Carrito:** vive en `localStorage`. Como cada comercio es un origen distinto (`alfa.` y `beta.`), los carritos quedan separados por el propio navegador.
2. **Formulario:** nombre, teléfono, retiro o envío, dirección si es envío, notas y Turnstile invisible.
3. **`POST /api/orders`** en el mismo host del catálogo, con `items: [{productId, qty}]`, datos del cliente, tipo de entrega, token de Turnstile y una clave de idempotencia generada al abrir el formulario.
4. **Servidor:** resuelve el comercio por el host; exige que esté publicado, con el módulo `orders` activo y abierto (o con `open_mode` que lo permita); valida con Zod (máximo 50 líneas, cantidades 1–99, largos de texto); verifica Turnstile; aplica límites de frecuencia.
5. **`private.create_order(tenant_id, datos)`**, llamada con la clave secreta y sin permiso para `anon` ni `authenticated`. En una transacción: lee los productos del comercio que están publicados y disponibles, rechaza los que falten, calcula subtotal, envío y total, verifica el pedido mínimo, toma el número siguiente de `tenant_counters`, inserta `orders` y `order_items` y emite `order.created`. Si la clave de idempotencia ya existe, devuelve el pedido existente.
6. **Mensaje:** el servidor arma el texto y la URL `https://wa.me/{número sin +}?text={texto codificado}` y responde `{número de pedido, url}`.
7. **Navegador:** muestra "Pedido #128 registrado", vacía el carrito y abre WhatsApp; si el navegador lo bloquea, queda el botón "Enviar por WhatsApp".
8. **Comercio:** recibe el mensaje y ve el pedido en el panel en "Nuevos".

### Ejemplo de mensaje

```
Hola Burger Alfa, quiero hacer este pedido:
Pedido #128
2 x Hamburguesa doble - $18.000
1 x Papas grandes - $6.500
Subtotal: $24.500
Envío: $1.500
Total: $26.000
Entrega: envío a Av. San Martín 123
Nombre: Lucía
Notas: sin cebolla
```

El mensaje se limita a unos 1.500 caracteres (las notas se recortan) para no superar el largo de URL que aceptan los teléfonos. No incluye links al panel ni datos internos.

### Límites contra abuso

| Límite | Valor inicial | Dónde |
| --- | --- | --- |
| Pedidos por IP y comercio | 5 cada 10 minutos | `rate_limits` con la IP como hash con sal, nunca la IP en claro |
| Pedidos por comercio | 200 por hora | `rate_limits` |
| Líneas por pedido | 50 | Zod y la función |
| Pedidos duplicados por doble clic | 0 | Clave de idempotencia única por comercio |
| Bots | Turnstile obligatorio | Servidor |

### Estados del pedido

`new` → `confirmed` → `preparing` → `ready` → `completed`, y `cancelled` desde cualquier estado anterior a `completed`. Cada cambio actualiza `status_changed_at` y emite `order.status_changed`.

### Por qué así

| Decisión | Por qué |
| --- | --- |
| Guardar antes de abrir WhatsApp | El comercio tiene el pedido aunque el cliente no envíe el mensaje, y más adelante se puede medir cuántos se concretan |
| Inserción por función privada, no por RLS anónima | Con RLS anónima cualquiera podría insertar directo con la clave pública, salteando Turnstile y los límites, y con precios inventados |
| Copia de nombre y precio en `order_items` | El historial no cambia cuando cambia el catálogo |
| Número por comercio (#1, #2...) | Es lo que el comercio y el cliente usan para hablar del pedido; el UUID queda interno |
| `wa.me` y no la API oficial | Gratis, sin aprobación de Meta y sin costo por mensaje; la API oficial llega con el módulo de IA, que leerá `order.created` |
| Panel con actualización cada 20 segundos y aviso en la pestaña | Suficiente para v1; Supabase Realtime (respeta RLS) queda preparado |
| Datos del cliente visibles solo para miembros; anonimización a los 12 meses (preparado) | Son datos personales: se guarda lo mínimo y por un plazo publicado |

## 12. Caché y prevención de filtraciones entre comercios

**Solo se cachea lo público, y siempre con el comercio dentro de la clave: el host forma parte de la ruta y cada función cacheada recibe el `tenant_id` o el host como argumento.** Panel y admin nunca se cachean. No hace falta Redis.

### Capas de caché

| Capa | Qué se cachea | Clave | Invalidación |
| --- | --- | --- | --- |
| Páginas del catálogo (Vercel / Next) | HTML de `/sites/[host]/...` | Incluye el host por estar en la ruta | `revalidateTag` al editar; respaldo por tiempo de 1 hora |
| Datos de Next (`'use cache'` + `cacheTag` en Next 16, `unstable_cache` en versiones anteriores) | `getStorefront(host)`, `getCatalog(tenantId)`, `getHours(tenantId)` | Los argumentos de la función | Tags `host:{host}`, `tenant:{id}:catalog`, `tenant:{id}:settings` |
| Navegador y CDN | Imágenes con nombre único | La URL | Nunca: una foto nueva tiene otra ruta |
| Panel y admin | Nada | — | `Cache-Control: private, no-store` |

Los tags se arman solo en `lib/cache/tags.ts` y cada server action que modifica datos termina en `revalidateTenant(tenantId, ámbito)`, con el `tenantId` obtenido en el servidor.

### Reglas que evitan filtraciones

1. **Funciones cacheadas sin contexto oculto:** dentro de una función cacheada está prohibido leer `headers()`, `cookies()` o la sesión; todo lo que define el resultado llega como argumento.
2. **Cliente público sin sesión:** el catálogo usa la clave pública con `persistSession: false` y sin cookies, así la respuesta nunca depende de quién la pide.
3. **Nada de estado global con datos de comercios:** prohibidos los `Map` o variables de módulo como caché casera; una función de Vercel atiende a muchos comercios seguidos.
4. **Cliente de Supabase por petición** en el panel; nunca un cliente con sesión compartido.
5. **El catálogo nunca setea cookies:** una respuesta con `Set-Cookie` no debe cachearse, y el proxy no toca la sesión en hosts de catálogo.
6. **Rutas del panel siempre dinámicas:** una prueba de CI revisa la salida de `next build` y falla si alguna ruta de `/panel` o `/admin` sale como estática.
7. **Invalidar después de confirmar:** primero termina la escritura, después se invalida; nunca con un ID que mandó el navegador.
8. **Errores públicos genéricos:** "producto no disponible", nunca "el producto pertenece a otro comercio".
9. **Logs sin datos personales:** Sentry etiqueta el comercio por su host y borra teléfonos, correos, cuerpos de petición, cookies, headers, parámetros de las URLs y variables locales (`src/lib/observability/scrub.ts`).
10. **Panel y admin con `noindex`** y fuera de `robots.txt` de los catálogos.

La regla 1 es la más importante: un `getCatalog()` que leyera el host de los headers dentro de la caché serviría el catálogo del primer comercio que lo pidió a todos los demás. La prueba E2E de la sección 13 que edita Alfa y mira Beta existe para detectar exactamente eso.

## 13. Pruebas automatizadas de aislamiento y seguridad

**Cinco capas de pruebas corren en cada PR contra un Supabase local con dos comercios de prueba, Alfa y Beta; si una falla, no se puede fusionar ni desplegar.** La pieza clave es una prueba sobre el propio esquema que detecta tablas nuevas sin RLS o sin `tenant_id` antes de que alguien escriba su prueba específica.

### Datos de prueba (`supabase/seed.sql`)

Comercios Alfa (publicado) y Beta (publicado), más Gamma (suspendido). Usuarios: dueño de Alfa, staff de Alfa, dueño de Beta, un usuario sin comercio y un superadmin. UUID fijos para que las pruebas sean reproducibles. Cada comercio tiene categorías, productos publicados y borradores, imágenes y pedidos.

### Capas

| Capa | Herramienta | Qué verifica |
| --- | --- | --- |
| 1. Esquema | pgTAP (`supabase test db`) | Toda tabla de `public` tiene RLS activado. Toda tabla fuera de la lista de globales tiene `tenant_id not null`, FK a `tenants` y el trigger de inmutabilidad. Toda FK entre tablas de comercio es compuesta. Ninguna política es `for all` ni apunta a `public`. Las funciones `security definer` de `public` son solo las de la lista cerrada. Toda vista tiene `security_invoker`. Toda tabla figura en la lista de cobertura de la capa 2 |
| 2. RLS por rol | pgTAP simulando cada rol (`set local role` + claims del JWT) | Para cada tabla y cada actor (anónimo, dueño Alfa, staff Alfa, dueño Beta, sin comercio): leer, crear, editar y borrar sobre filas de Alfa y de Beta. Cambiar `tenant_id` de una fila. Crear un producto de Alfa con categoría de Beta (lo rechaza la FK). Staff editando ajustes. Anónimo leyendo borradores o el catálogo de Gamma |
| 3. Integración | Vitest + supabase-js + rutas de Next contra el entorno local | Sesiones reales: subir una imagen a la carpeta de Beta siendo Alfa; pedido en el host de Alfa con un producto de Beta; precio manipulado (se ignora); producto en borrador (rechazado); comercio suspendido (rechazado); límite de frecuencia; idempotencia; invitación vencida; acciones del admin sin `aal2` (rechazadas) y con `aal2` (auditadas); límites de plan |
| 4. E2E | Playwright con `*.localhost` | Registro → publicación → pedido → URL de WhatsApp correcta. El catálogo de Alfa no muestra nada de Beta. El dueño de Alfa en `/beta/...` recibe 404. Editar un producto de Alfa no cambia la página cacheada de Beta |
| 5. Estática | ESLint, TypeScript, gitleaks, `supabase db lint`, script propio | Fronteras de importación y uso de `service.ts`; ninguna variable con `SECRET` o `SERVICE` lleva prefijo `NEXT_PUBLIC_`; tipos generados sin diferencias con el esquema; rutas del panel dinámicas en el build |

### Reglas de trabajo

- Una tabla nueva no pasa CI hasta que se agrega a la lista de cobertura y tiene su bloque en la capa 2; la capa 1 lo exige sola.
- Cada bug de seguridad que aparezca se convierte primero en una prueba que falla y después se corrige.
- Las pruebas de capa 2 se escriben a mano y se revisan con cuidado, también cuando el resto del código lo genere Claude Code: son la parte que no conviene aceptar sin leer.
- Antes de cada despliegue a producción se revisa el Security Advisor de Supabase; en v1 a mano, más adelante por CLI en CI.

### Pipeline de CI en cada PR

1. Instalar dependencias, `tsc`, ESLint, script de variables de entorno, gitleaks.
2. Levantar Supabase local y aplicar todas las migraciones desde cero (detecta migraciones que no aplican limpias).
3. Capas 1 y 2 (pgTAP).
4. Capa 3 (Vitest).
5. `next build` y verificación de rutas dinámicas.
6. Capa 4 en modo humo (los 4 recorridos principales).

La CLI de Supabase usa Docker para el entorno local y de CI; eso no contradice el "sin Docker" del análisis, que se refiere a no desplegar contenedores propios en producción.

## 14. Migraciones y entornos

**Tres entornos (local, staging y producción) y un único camino para cambiar la base: archivos SQL versionados en `supabase/migrations`, aplicados por CI primero en staging y después, con aprobación manual, en producción, antes de desplegar el código.**

### Entornos

| Entorno | Supabase | Vercel | Dominio | Datos |
| --- | --- | --- | --- | --- |
| Local | Supabase CLI en tu máquina | `next dev` | `*.localhost:3000` | `seed.sql` ficticio |
| Staging | Proyecto en una organización Free separada (USD 0; se pausa tras una semana sin uso) | Rama `staging` | `*.staging.tuapp.com.ar` | Ficticios; nunca copias de producción |
| Producción | Proyecto Pro (São Paulo) | Rama `produccion` (la mueve solo el flujo de publicación) | `*.vidri.ar` | Reales |

Los previews de Vercel por PR sirven para probar panel y admin; los catálogos se prueban en staging porque los previews no tienen subdominios comodín.

### Reglas de migración

1. Todo cambio de esquema se crea con `supabase migration new` y se prueba en local. En producción no se cambia nada desde el dashboard; si alguna vez pasa, se captura de inmediato con `supabase db diff`.
2. Solo hacia adelante: una migración aplicada no se edita; deshacer es escribir otra.
3. Cada migración trae completos tabla, restricciones, índices, RLS, políticas, permisos y triggers, y el PR trae sus pruebas.
4. Cambios incompatibles en dos pasos (expandir y contraer): agregar la columna nueva como opcional, rellenarla, desplegar el código que la usa y recién en una versión posterior volverla obligatoria o borrar la vieja. Así el código viejo y el nuevo funcionan con el mismo esquema durante el despliegue.
5. Índices sobre tablas grandes con `create index concurrently`, en una migración propia.
6. Nombres `AAAAMMDDHHMMSS_<módulo>_<cambio>.sql`, por ejemplo `20261110120000_catalog_products.sql`.
7. Tipos de TypeScript generados con `supabase gen types` y versionados; CI falla si no coinciden con el esquema.
8. Antes de una migración riesgosa (borrar columnas, mover datos), copia manual de la base además del backup diario de Pro.

### Camino de un cambio a producción

1. PR → CI completo (sección 13).
2. Fusión en `staging` → GitHub Actions aplica las migraciones al proyecto de staging (`supabase db push`) y Vercel despliega staging.
3. Revisión rápida en staging: un catálogo, un pedido, el panel.
4. Desde `main`, el flujo manual "Publicar en producción" (`.github/workflows/produccion.yml`) comprueba que el commit pasó CI y está en staging, aplica las migraciones a producción y recién después mueve la rama `produccion`, que es la rama de producción del proyecto de Vercel. Disparar el flujo es la aprobación manual: GitHub Free no tiene entornos protegidos con revisores en repos privados (cambio del 2026-11-24; antes decía entorno protegido + deploy hook). Guía: `docs/runbooks/produccion.md`.

### Variables de entorno

| Variable | Pública | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Cliente de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Clave pública (anon / publishable) |
| `SUPABASE_SECRET_KEY` | No | Clave secreta (service\_role); solo `lib/supabase/service.ts` |
| `ROOT_DOMAIN` | No | `tuapp.com.ar`, `staging.tuapp.com.ar` o `localhost` |
| `NEXT_PUBLIC_IMAGES_BASE_URL` | Sí | Base de URLs de imágenes |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Sí / No | Anti-bots |
| `RESEND_API_KEY` | No | Correos propios (hoy los de Supabase Auth salen por SMTP de Resend; sin avisos de vencimiento desde el 2026-11-21) |
| `CRON_SECRET` | No | Protege `/api/cron/daily` |
| `IP_HASH_SALT` | No | Hash de IPs para límites de frecuencia |
| `NEXT_PUBLIC_SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Sí / Sí | Errores (opcionales: sin DSN no se envía nada) |

Todas se validan con Zod al arrancar (`lib/env.ts`): si falta una, la app no levanta. Cada entorno tiene claves propias; MFA en GitHub, Vercel, Supabase, el registrador del dominio y tu correo.

## Alcance: implementar, dejar preparado, no desarrollar

**La v1 es el núcleo multitenant completo más catálogo y pedidos a WhatsApp, con cobro manual; lo "preparado" son tablas, columnas o puntos de extensión que ya existen pero sin pantalla ni lógica.**

| Área | Implementar en v1 | Dejar preparado | No desarrollar todavía |
| --- | --- | --- | --- |
| Núcleo multitenant | Las 19 tablas del núcleo, RLS, FK compuestas, triggers de inmutabilidad y límites de plan | `event_consumers` (cursor por consumidor de eventos) | Un esquema o proyecto por comercio |
| Autenticación | Email y contraseña, confirmación, recuperación, invitaciones de staff, MFA obligatorio para admins | MFA para dueños en pantalla; Custom Access Token Hook | Login social, SSO, roles a medida |
| Dominios | Subdominios con comodín, slugs reservados | Dominio propio (`domains.kind = 'custom'`, flujo con API de Vercel) | Cloudflare for SaaS |
| Catálogo | Categorías, productos, fotos, destacados, sin stock, importación desde planilla, plantillas por rubro | Variantes y adicionales (`order_items.options`), búsqueda de texto, horarios especiales y feriados | Editor visual de arrastrar y soltar, temas ilimitados, control de stock |
| Imágenes | Bucket público, procesamiento con `sharp`, dos tamaños | Bucket privado, barrido de huérfanos, paso a R2 cambiando una variable | Transformaciones de Supabase o Vercel |
| Pedidos | Carrito, pedido guardado, número por comercio, estados, límites anti-abuso, panel con actualización periódica | Realtime, anonimización a 12 meses, estadísticas | Pagos online, envíos con logística, facturación electrónica |
| WhatsApp | Link `wa.me` con mensaje armado por el servidor | Evento `order.created` listo para que lo lea un módulo | API oficial de WhatsApp Business |
| Panel central | Comercios, ficha, alta asistida, cobros manuales, estados, modo soporte, auditoría, resumen, cron diario | Acciones masivas, edición de planes y módulos desde pantalla | Suplantar usuarios, BI propio |
| Cobro | Link de Mercado Pago y registro manual del pago | `subscriptions.provider = 'mercadopago'` y `provider_ref` para el webhook | Multimoneda, Stripe |
| Módulos futuros | Tablas `modules` y `tenant_modules` con `catalog` y `orders` | Prefijos y carpetas para `bookings`, `crm`, `ai`, `automations` | Cualquiera de esos módulos antes de tener \~30 clientes estables |
| Infraestructura | Vercel, Supabase, Resend, Turnstile, Sentry; staging y producción | — | Microservicios, colas externas, Redis, GraphQL, Kubernetes, ORM que use la clave secreta |
| Pruebas | Las 5 capas de la sección 13 en cada PR | Monitoreo sintético que compare dos catálogos en producción | Pruebas de carga |

### Cómo entran IA, turnos, CRM y automatizaciones sin tocar el catálogo

1. **Un módulo = carpeta + tablas con prefijo + fila en `modules`.** Se activa por comercio en `tenant_modules`; todas sus tablas siguen las mismas reglas de `tenant_id`, RLS y pruebas.
2. **Lee, no escribe, lo ajeno.** El agente IA lee productos y horarios con las mismas consultas del catálogo; nunca escribe en `catalog_*` ni en `orders`.
3. **Se entera por `events`.** Turnos, CRM y automatizaciones reaccionan a `order.created` o `tenant.published` leyendo la tabla con un cursor propio, sin que el catálogo sepa que existen.
4. **El trabajo pesado va fuera de la petición del comprador.** Llamadas a modelos de IA o a la API de WhatsApp corren en tareas de fondo (Supabase Queues o funciones programadas), así un fallo o una demora del módulo nunca frena una visita al catálogo ni un pedido.
5. **Se cobra aparte.** El costo variable de IA y WhatsApp se mide por comercio en las tablas del módulo, para cobrarlo por conversación como recomendó el análisis.

### Verificar al implementar

Estos datos salen de documentación que no reconsulté para este documento: el requisito de nameservers de Vercel para subdominios comodín, el límite de 4,5 MB de cuerpo en funciones de Vercel, el nombre `proxy.ts` de Next 16 y el formato vigente de las claves de Supabase (publishable / secret).
