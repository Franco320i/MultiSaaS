# Catálogo nuevo (parte 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una plantilla única de catálogo (grilla de fotos) con buscador, categorías en píldoras, orden por precio, "Cómo llegar", chips de envío/mínimo/pagos, recuadro "Todos los pedidos incluyen", etiquetas con "Ahorrás", y una ficha del producto que sube desde abajo con fotos y características.

**Architecture:** Columnas nuevas en `tenant_settings` (`payment_methods`, `highlights`) y `catalog_products` (`tags`, `specs`), validadas por CHECK. `storefront_by_host` las devuelve; `getPublicCatalog` trae todas las fotos, etiquetas y características. La vista del catálogo sigue siendo de servidor y delega a un componente de cliente (`CatalogBrowser`) la búsqueda, el orden, las píldoras y la ficha; los botones de pedidos llegan como elementos ya armados (`productAction(product, variant)`), así catálogo no importa pedidos. Lógica de presentación pura y probada.

**Tech Stack:** Next.js 16.4 (`cacheComponents`), React 19.3, Tailwind 4 (tokens Sobremesa), Supabase Postgres + pgTAP, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-22-catalogo-nuevo-design.md`

## Global Constraints

- Una sola plantilla para todos los catálogos; el local solo personaliza portada, logo, nombre, frase y color (ya existen).
- Etiquetas fijas: `nuevo` Nuevo, `ultimas_unidades` Últimas unidades, `vegetariano` Vegetariano, `vegano` Vegano, `sin_tacc` Sin TACC, `picante` Picante. Hasta 3 por producto. "Oferta" automática con precio anterior.
- Medios de pago: `efectivo` Efectivo, `transferencia` Transferencia, `mercado_pago` Mercado Pago, `debito` Débito, `credito` Crédito.
- "Todos los pedidos incluyen": hasta 4 frases de hasta 60 letras. Título fijo.
- Características: hasta 8 filas `{label ≤ 30, value ≤ 60}`.
- Íconos SVG dibujados, nunca emojis. Tokens Sobremesa, mobile first a 375 px, objetivos táctiles de 44 px, contraste AA.
- No cambia nada de pedidos, carrito, `create_order`, planes ni límites.
- Reglas de CLAUDE.md: comercio desde el host o `requireTenantAccess`, Zod en todo lo que entra, `revalidatePublicCatalog` / `revalidateStorefrontSettings` después de escribir, `'use cache'` solo con el comercio en la clave.

## Review Focus

1. Búsqueda con acentos y mayúsculas ("cafe" encuentra "Café", "VEGANO" encuentra la etiqueta Vegano) → prueba en Tarea 2.
2. Un producto sin fotos en la grilla y en la ficha (bloque del color de la marca, sin carrusel) → prueba E2E en Tarea 6 sobre un producto del seed sin foto.
3. Formulario de producto con error: las etiquetas tildadas y las filas de características no se pierden al volver a mostrarse → prueba de `productFormFromData` en Tarea 4.
4. Dirección sin ciudad o con caracteres raros en "Cómo llegar" (se codifica bien en la URL) → prueba en Tarea 2.
5. Cerrar la ficha con "Atrás" del celular no saca al cliente del catálogo → prueba E2E en Tarea 6 (`page.goBack()` deja la URL del catálogo y la ficha cerrada).

---

### Task 1: Base de datos

**Files:**
- Create: `supabase/migrations/<ts>_catalog_details.sql` (vía `npx supabase migration new catalog_details`)
- Create: `supabase/tests/10_catalog_details.test.sql`
- Modify: `src/types/database.ts` (`npm run db:types`)

**Interfaces:**
- Produces: `tenant_settings.payment_methods text[] not null default '{}'`, `tenant_settings.highlights text[] not null default '{}'`, `catalog_products.tags text[] not null default '{}'`, `catalog_products.specs jsonb not null default '[]'`; `storefront_by_host` devuelve además `payment_methods` y `highlights`.

- [ ] **Step 1: Pruebas pgTAP (fallan):** dueño de Alfa guarda `payment_methods = {efectivo,transferencia}` y `highlights` de 4 frases; rechaza `{cheque}` (23514), 5 frases (23514) y una frase de 61 letras (23514); staff de Alfa no puede cambiar `payment_methods` (0 filas o 42501); staff guarda `tags = {nuevo,picante}` y `specs = [{"label":"Material","value":"Lino"}]`; rechaza `tags = {nuevo,picante,vegano,sin_tacc}`, `{oferta}`, `specs` con 9 filas, label de 31, value de 61 o sin `value`; dueño de Beta no ve ni cambia lo de Alfa; `storefront_by_host('alfa.localhost')` como anon trae `payment_methods` y `highlights`; Gamma (suspendido) sigue devolviendo `{"available": false}`.
- [ ] **Step 2:** `npm run db:test` → FAIL (columnas inexistentes).
- [ ] **Step 3: Migración:** funciones `private.texts_fit(p text[], p_max_items int, p_max_len int) returns boolean` y `private.specs_valid(p jsonb) returns boolean`, ambas `immutable`, `set search_path = ''`, `security invoker`, con `grant execute` a `authenticated` (las usan los CHECK); columnas con CHECK (`<@` contra la lista y las funciones); `grant update (payment_methods, highlights)` en `tenant_settings` y `grant insert/update (tags, specs)` en `catalog_products` a `authenticated`; `create or replace function public.storefront_by_host` con la misma firma y los dos campos nuevos (resto idéntico al de `20261115100855`).
- [ ] **Step 4:** `npm run db:reset && npm run db:test && npm run db:lint && npm run db:advisors && npm run db:types` → PASS, sin errores, sin avisos.
- [ ] **Step 5: Commit** "Catálogo nuevo: columnas de pagos, frases, etiquetas y características".

### Task 2: Lógica de presentación (pura)

**Files:**
- Create: `src/lib/catalog-options.ts` (listas compartidas por catálogo y ajustes)
- Create: `src/modules/catalog/presentation.ts`, `src/modules/catalog/presentation.test.ts`

**Interfaces:**
- Produces (`src/lib/catalog-options.ts`): `PRODUCT_TAGS: readonly {value, label}[]`, `ProductTag`, `PAYMENT_METHODS: readonly {value, label}[]`, `PaymentMethod`, `MAX_TAGS = 3`, `MAX_HIGHLIGHTS = 4`, `HIGHLIGHT_MAX = 60`, `MAX_SPECS = 8`, `SPEC_LABEL_MAX = 30`, `SPEC_VALUE_MAX = 60`.
- Produces (`presentation.ts`): `visibleTags(p: {tags: string[]; price: number; compareAtPrice: number|null}): string[]` (etiquetas en el orden de la lista, "Oferta" primero si corresponde, máximo 3); `savingsLabel(price, compareAtPrice, currency): string | null` ("Ahorrás $ 2.000"); `normalizeSearch(s): string` (minúsculas, sin acentos, espacios simples); `filterProducts<T extends SearchableProduct>(products: T[], query: string): T[]` (cada palabra tiene que aparecer en nombre, descripción o etiquetas); `sortByPrice<T extends {price:number}>(products: T[], order: "none"|"asc"|"desc"): T[]` (estable, sin mutar); `storeChips(s: {accepts_delivery, accepts_pickup, delivery_fee, min_order_amount, payment_methods, currency}): string[]` ("Envío $ 1.500" o "Envío gratis", "Solo retiro" si no hace envíos, "Mínimo $ 5.000" si hay mínimo, "Efectivo · Transferencia" con los pagos en el orden de la lista); `mapsUrl(address: string|null, city: string|null): string | null` (`https://www.google.com/maps/search/?api=1&query=` + `encodeURIComponent("dirección, ciudad")`; null sin dirección).

- [ ] **Step 1: Pruebas** (fallan): cada función con los casos del spec: Oferta automática y tope de 3; "Ahorrás" null sin precio anterior; "cafe" encuentra "Café", "VEGANO" encuentra la etiqueta, "doble ched" encuentra "Doble cheddar", vacío devuelve todo; orden asc/desc estable y sin mutar; chips para envío con costo, envío gratis, solo retiro, mínimo 0 (sin chip), pagos vacíos (sin chip); `mapsUrl("Mitre 450", "Santa Rosa")`, sin ciudad, con "&" y "ñ" codificados, null sin dirección.
- [ ] **Step 2:** `npx vitest run src/modules/catalog/presentation.test.ts` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5: Commit** "Catálogo nuevo: lógica de etiquetas, búsqueda, orden y datos del local".

### Task 3: Ajustes del local (pagos y "Todos los pedidos incluyen")

**Files:**
- Modify: `src/modules/settings/schemas.ts` (`contactSchema` suma `payment_methods`, `highlights`), `src/modules/settings/actions.ts` (`saveContactAction` lee con `getAll`), `src/modules/settings/queries.ts` (`getSettings` y su tipo), `src/modules/settings/components/contact-form.tsx` (casillas de pago y 4 campos de frases), `src/modules/settings/settings.test.ts`, `src/core/tenancy/storefront.ts` (esquema Zod suma los dos campos con `default([])`), y las páginas de Ajustes y del asistente que pasan `values`.

**Interfaces:**
- Consumes: Tarea 1 (columnas), Tarea 2 (`PAYMENT_METHODS`, `MAX_HIGHLIGHTS`, `HIGHLIGHT_MAX`).
- Produces: `Storefront.payment_methods: PaymentMethod[]`, `Storefront.highlights: string[]`.

- [ ] **Step 1: Pruebas** (fallan) en `settings.test.ts`: `contactSchema` acepta `payment_methods: ["efectivo","mercado_pago"]` y `highlights: ["Funda de regalo", "", "  "]` → `["Funda de regalo"]` (vacíos descartados); rechaza `["cheque"]` y una frase de 61 letras con mensaje en castellano ("Cada frase puede tener hasta 60 letras.").
- [ ] **Step 2:** FAIL → **Step 3:** implementar (al volver con error, las casillas se repueblan desde `fields.payment_methods` unido por coma) → **Step 4:** PASS.
- [ ] **Step 5: Commit** "Ajustes: medios de pago y Todos los pedidos incluyen".

### Task 4: Producto (etiquetas y características)

**Files:**
- Modify: `src/modules/catalog/schemas.ts` (`productFormSchema` suma `tags` y `specs`; nueva `productFormFromData(formData: FormData): Record<string, unknown>` que arma el objeto con `getAll("tags")` y los pares `spec_label`/`spec_value`), `src/modules/catalog/actions.ts` (usa `productFormFromData`; `submitted` guarda `tags` unidas por coma y `specs` como JSON), `src/modules/catalog/mutations.ts` (`productValues`), `src/modules/catalog/queries.ts` (tipo `Product`), `src/modules/catalog/components/product-form.tsx` (casillas de etiquetas y filas de características con "Agregar característica" / "Quitar"), `src/modules/catalog/schemas.test.ts`.

**Interfaces:**
- Consumes: Tarea 2 (`PRODUCT_TAGS`, límites).
- Produces: `ProductForm.tags: ProductTag[]`, `ProductForm.specs: {label: string; value: string}[]`.

- [ ] **Step 1: Pruebas** (fallan): `productFormFromData` con dos `tags` y tres pares de característica (uno vacío) → `tags` de 2 y `specs` de 2; `productFormSchema` rechaza 4 etiquetas ("Elegí hasta 3 etiquetas."), una etiqueta fuera de la lista, 9 características, un label con valor vacío ("Completá el valor de «Material»."); recorta espacios.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS (`npm run check`).
- [ ] **Step 5: Commit** "Productos: etiquetas y características".

### Task 5: Catálogo público con la plantilla nueva

**Files:**
- Modify: `src/modules/catalog/public-queries.ts` (`PublicProduct` suma `images: {path, alt}[]`, `tags`, `specs`; se quitan `imagePath`/`imageAlt` y se actualizan sus usos), `src/modules/catalog/components/storefront/storefront-view.tsx` (portada igual; debajo: estado y ciudad, dirección con "Cómo llegar", chips, recuadro "Todos los pedidos incluyen", y `<CatalogBrowser>`), `src/modules/catalog/index.ts`, `src/app/sites/[host]/page.tsx` (`productAction(product, variant)`).
- Create: `src/modules/catalog/components/storefront/catalog-browser.tsx` (cliente: buscador, píldoras fijas que llevan a cada sección, "Ordenar" con tres opciones, secciones "Destacados" + categorías + "Otros"; con búsqueda u orden activos, una grilla única de resultados; estado sin resultados), `product-card.tsx` (foto 4:5 o bloque de marca, etiquetas, nombre, precio, "Ahorrás", botón de la variante `card`), `icons.tsx` (SVG: lupa, mapa, tilde, x, flechas).
- Delete: `category-nav.tsx` (lo reemplaza `CatalogBrowser`).

**Interfaces:**
- Consumes: Tareas 1 a 3.
- Produces: `StorefrontView({storefront, catalog, productAction?: (p: PublicProduct, variant: "card" | "sheet") => ReactNode, children})`; `CatalogBrowser({products, categories, currency, actions: Record<string, {card: ReactNode; sheet: ReactNode}>})`.

- [ ] **Step 1:** Implementar las piezas con los tokens de Sobremesa y la lógica de la Tarea 2.
- [ ] **Step 2:** Revisar en el navegador a 375 y 1280 px, claro y oscuro: Alfa (con fotos) y Beta; búsqueda con y sin resultados; orden; píldoras; chips; recuadro; "Cómo llegar".
- [ ] **Step 3:** `npm run check` y `npm run build` → PASS; rutas del catálogo siguen con la cáscara estática.
- [ ] **Step 4: Commit** "Catálogo: plantilla de grilla con buscador, orden y datos del local".

### Task 6: Ficha del producto y botón con precio

**Files:**
- Create: `src/modules/catalog/components/storefront/product-sheet.tsx` (cliente, `<dialog>`; sube desde abajo en el celular con un margen arriba, centrada desde 640 px; carrusel con `scroll-snap` y puntitos; nombre, etiquetas, precio, "Ahorrás", descripción completa, tabla de características, botón de la variante `sheet`; al abrir hace `history.pushState`, "Atrás" la cierra; Escape y la X también).
- Modify: `src/modules/orders/components/add-to-cart.tsx` (prop `price?: string`: con precio, botón ancho "Agregar · $ 9.000"; el selector de cantidad no cambia), `src/app/sites/[host]/page.tsx` (variante `sheet` con precio formateado), `e2e/pedido.spec.ts` o el archivo del recorrido de pedido (sumar: abrir la ficha, agregar desde la ficha, cerrar con `page.goBack()`; producto sin foto abre la ficha sin carrusel).

**Interfaces:**
- Consumes: Tarea 5 (`CatalogBrowser` abre `ProductSheet` con el producto elegido y su nodo `sheet`).

- [ ] **Step 1:** E2E nuevo (falla): tocar un producto de Alfa abre un `dialog` con su nombre como título y un botón "Agregar · $"; agregar desde ahí muestra "Ver pedido · 1"; `page.goBack()` cierra la ficha y la URL sigue en el catálogo; el recorrido de pedido existente sigue pasando.
- [ ] **Step 2:** Implementar.
- [ ] **Step 3:** `npm run build && npm run db:reset && npm run test:e2e` → PASS.
- [ ] **Step 4: Commit** "Catálogo: ficha del producto con fotos y características".

### Task 7: Documentación, verificación completa y revisión

- [ ] `docs/design/sistema-visual.md`: sección del catálogo reescrita (grilla, píldoras, buscador, chips, recuadro, ficha, botón con precio).
- [ ] `CLAUDE.md`: "Catálogo público (cómo está armado)" y pendiente del catálogo para Base y Pro (parte 2 hecha).
- [ ] `/auditoria-aislamiento` sobre los cambios (base, caché, acciones).
- [ ] Suite completa: `db:reset`, `db:test`, `db:lint`, `db:advisors`, `check:types`, `test:integration`, `check`, `build`, `check:build`, `db:reset`, `test:e2e`.
- [ ] Revisión final de toda la rama con un revisor aparte; corregir lo crítico o importante con su prueba.
- [ ] Commit final.
