# Rediseño 11b: catálogo público · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Catálogo público estilo PPW: títulos sin serifa, colores derivados del color del comercio, portada y tarjeta de estado nuevas, buscador fijo, Carta o Grilla según el rubro, y aviso y barra de pedido nuevos.

**Architecture:** Los colores derivados se calculan en el servidor (`src/lib/color.ts`) a partir de `brand` y viajan en el `Storefront` cacheado; `StorefrontView` los expone como variables CSS. La forma (Carta o Grilla) sale de `template_key` con una función pura. Lo que depende de la hora ("hoy") se calcula en el navegador, como `OpenStatus`. Sin cambios en la base.

**Tech Stack:** Next.js 16.4 (`cacheComponents`, `'use cache'` en el catálogo), React 19.3, Tailwind 4, Vitest (node), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-26-rediseno-catalogo-design.md` (leerlo antes de cada tarea). Maqueta: https://claude.ai/artifact/4iHpbqzH1iLeE6FP8vcyDZ (versiones 2 y 3).

## Global Constraints

- **No agregar ninguna opción para que el comercio elija Carta o Grilla, ni temas.** La forma la decide `template_key`.
- Sin cambios en la base de datos ni en `storefront_by_host`.
- Caché (CLAUDE.md, regla 7): nada nuevo se lee de `headers()`, `cookies()` ni de la sesión en el catálogo; los colores derivados se calculan dentro de `getStorefront` a partir de datos ya cacheados.
- Nombres accesibles que usan los E2E, sin cambiar: searchbox "Buscar en el catálogo", botones "Ver {producto}", "Elegir opciones de {producto}", "Agregar {producto} al pedido", y el botón de la barra que empieza con "Ver pedido · N".
- Contraste AA (4,5:1) en claro y oscuro; táctiles de 44 px.
- Íconos SVG en `src/modules/catalog/components/storefront/icons.tsx`, nunca emojis.
- Un módulo no importa otro (catálogo ↔ pedidos se conectan por la ruta); `src/lib` y `src/ui` no importan `core` ni módulos.
- Antes de usar una API de Next, leer su guía en `node_modules/next/dist/docs/`. `npm run check` antes de cada commit. No hacer push sin permiso del usuario.

## Review Focus

1. **Modo oscuro:** el fondo teñido y las tarjetas blancas no aparecen en oscuro; el texto sigue legible sobre `background`/`surface`.
2. **Comercio sin foto de portada, sin logo o con productos sin foto:** degradé, iniciales y filas sin hueco.
3. **Medianoche y zona horaria:** "Hoy" muestra el día correcto en la zona del comercio, no en la del visitante.
4. **Caché:** el catálogo de un host no aparece en otro; un cambio de color en el panel se ve en el catálogo (invalida `tenant:{id}:settings`).
5. **Pantalla de 320 px:** la tarjeta de estado, la fila Carta y la barra del pedido no se desbordan.

---

### Task 1: Títulos sin serifa en el catálogo

**Files:**
- Modify: `src/app/globals.css` (regla de `.font-display` compartida por `panel` y `storefront`)
- Modify: `src/modules/catalog/components/storefront/storefront-view.tsx` (raíz con `data-surface="storefront"`)

- [ ] **Step 1:** En `globals.css`, `[data-surface="panel"], [data-surface="storefront"] { --font-display-family: var(--font-hanken); }` y la regla de peso 800 / −0,02em para `.font-display` dentro de las dos superficies.
- [ ] **Step 2:** `data-surface="storefront"` en el `<div>` raíz de `StorefrontView`.
- [ ] **Step 3:** `npm run check` → PASS. En el navegador, `alfa.localhost:3000`: el nombre del comercio en Hanken 800; la página principal sigue con Young Serif.
- [ ] **Step 4:** Commit `Rediseño 11b: títulos sin serifa en el catálogo`.

### Task 2: Colores derivados del color del comercio

**Files:**
- Create: `src/lib/brand-palette.ts` (mover `BRAND_PALETTE` desde `src/modules/settings/schemas.ts`, que pasa a importarlo)
- Modify: `src/lib/color.ts`
- Test: `src/lib/color.test.ts` (crear o extender)
- Modify: `src/core/tenancy/storefront.ts` (tipo `Storefront` y retorno)
- Modify: `src/app/globals.css` (`@theme inline`: `--color-brand-2`, `--color-brand-tint`, `--color-brand-page`; valores por defecto en `:root` iguales a `--brand`/`#fbfbf9`)
- Modify: `storefront-view.tsx` (variables `--brand-2`, `--brand-tint`, `--brand-page` en `brandStyle`)

**Interfaces:**
- Produces: `mixHex(a: string, b: string, weight: number): string` (weight = proporción de `a`, 0 a 1, resultado `#rrggbb` en minúsculas); `brandShades(brand: string): { brand2: string; tint: string; page: string }`; `Storefront` suma `brand2`, `brandTint`, `brandPage`; utilidades `bg-brand-2`, `bg-brand-tint`, `bg-brand-page`, `text-brand`.

- [ ] **Step 1: Pruebas** en `color.test.ts`:
  - `mixHex("#000000", "#ffffff", 0.5)` es `"#808080"`, `mixHex("#c2410c", "#ffffff", 1)` es `"#c2410c"` y con 0 es `"#ffffff"`;
  - para cada color de `BRAND_PALETTE`, con `s = brandShades(color)`: `contrastRatio(color, s.tint) >= 4.5`, `contrastRatio(color, s.page) >= 4.5`, `contrastRatio(color, "#ffffff") >= 4.5` y `contrastRatio("#ffffff", s.brand2) >= 4.5`;
  - `s.page` es distinto de `#fbfbf9` (está teñido) y `s.tint` es más claro que `color`.
- [ ] **Step 2:** `npx vitest run src/lib/color.test.ts` → FAIL.
- [ ] **Step 3:** Implementar `mixHex` y `brandShades` (proporciones: las que pasen la prueba; partir de `brand2 = mix(brand, negro, 0.62)`, `tint = mix(brand, blanco, 0.12)`, `page = mix(brand, #fbfbf9, 0.04)` y ajustar). Si un color de la lista no llega a 4,5 contra blanco, la prueba lo dice: ajustar la proporción, no la prueba. Mover `BRAND_PALETTE`. `getStorefront` agrega `...brandShades(brand)` renombrado a `brand2`, `brandTint`, `brandPage`.
- [ ] **Step 4:** Prueba → PASS; `npm run check` → PASS (incluye `settings` usando el nuevo import).
- [ ] **Step 5:** Commit `Rediseño 11b: colores derivados del color del comercio`.

### Task 3: Forma según el rubro y horario de hoy

**Files:**
- Modify: `src/modules/catalog/presentation.ts`, `src/lib/hours.ts`
- Test: `src/modules/catalog/presentation.test.ts`, `src/lib/hours.test.ts` (extender los que existan)

**Interfaces:**
- Produces: `type CatalogLayout = "carta" | "grilla"`; `catalogLayout(templateKey: string): CatalogLayout`; `todayHours(hours: HoursRange[], now: Date, timeZone: string): string` en `src/lib/hours.ts` (mismo formato de rangos que `summarizeHours`, o `"Cerrado hoy"`).

- [ ] **Step 1: Pruebas:**
  - `catalogLayout`: `gastronomia`, `dietetica`, `general` → `"carta"`; `indumentaria`, `tecnologia` → `"grilla"`; `"otro"` → `"carta"`.
  - `todayHours`: con un horario de lunes 19:00–00:30 y `now` = lunes 2026-11-23 22:00 en `America/Argentina/Buenos_Aires`, devuelve el rango del lunes; con `now` = martes 01:00 UTC (todavía lunes en Buenos Aires), también el del lunes; un día sin rangos → `"Cerrado hoy"`.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar. `todayHours` reutiliza `rangesOf` y el cálculo de día de la semana en la zona del comercio que ya use `isOpenAt` (sin duplicarlo).
- [ ] **Step 4:** Pruebas → PASS; `npm run check` → PASS.
- [ ] **Step 5:** Commit `Rediseño 11b: forma según el rubro y horario de hoy`.

### Task 4: Portada y tarjeta de estado

**Files:**
- Modify: `src/modules/catalog/components/storefront/storefront-view.tsx`
- Create: `src/modules/catalog/components/storefront/today-hours.tsx` (cliente: `todayHours` + `<details>` con `summarizeHours`)
- Modify: `src/modules/catalog/components/storefront/icons.tsx` (los que falten: reloj, moto o envío, billete, mapa ya existe)

**Interfaces:**
- Consumes: `brand2`/`brandTint`/`brandPage` (Task 2), `todayHours` (Task 3).

- [ ] **Step 1:** Portada, logo montado, iniciales, nombre, frase y línea "Cómo llegar" según la sección "Portada y tarjeta de estado" del spec. Fondo de la página `bg-brand-page` solo en claro (`dark:bg-background`).
- [ ] **Step 2:** Tarjeta de estado de 2 columnas (Estado con `OpenStatus`, Pedido mínimo si > 0, Hoy con `TodayHours`, Envío: "$ …", "Gratis" o "Solo retiro"); medios de pago en una línea debajo. Se dejan de usar `storeChips` y el `<details>` "Ver horarios" (borrar `storeChips` y su prueba si queda sin uso).
- [ ] **Step 3:** "Todos los pedidos incluyen" con fondo `brand-tint` en claro.
- [ ] **Step 4:** `npm run check` → PASS. Navegador a 375 y 320 px: Alfa con logo y portada del seed, y un caso sin portada ni logo (Gamma o cambiar en la base local) → degradé e iniciales.
- [ ] **Step 5:** Commit `Rediseño 11b: portada y tarjeta de estado`.

### Task 5: Buscador fijo, píldoras y secciones

**Files:**
- Modify: `src/modules/catalog/components/storefront/catalog-browser.tsx`

- [ ] **Step 1:** Un contenedor `sticky top-0` con el buscador, "Ordenar" y `CategoryPills` (las píldoras solo sin búsqueda). Fondo `bg-brand-page dark:bg-background`, sombra suave. Mantener el `IntersectionObserver` de la píldora activa y `scroll-mt` de las secciones ajustado al nuevo alto del contenedor.
- [ ] **Step 2:** Estilos de buscador (48 px, radio 14), píldoras (40 px, activa con `bg-brand text-brand-foreground` y sombra teñida) y secciones (título 24 px, descripción, rayita `bg-brand` de 28 × 3 px) según el spec.
- [ ] **Step 3:** `npm run check` → PASS; en el navegador, bajar por el catálogo de Alfa: el buscador y las píldoras quedan arriba y la píldora activa sigue a la sección.
- [ ] **Step 4:** Commit `Rediseño 11b: buscador fijo, píldoras y secciones`.

### Task 6: Tarjeta Carta y Grilla según el rubro

**Files:**
- Modify: `src/modules/catalog/components/storefront/product-card.tsx` (sumar `ProductRow`; precio del color del comercio en `PriceBlock` con prop de tono)
- Modify: `catalog-browser.tsx` (prop `layout: CatalogLayout`), `storefront-view.tsx` (pasa `catalogLayout(storefront.template_key)`)

**Interfaces:**
- Consumes: `catalogLayout` (Task 3).
- Produces: `<ProductRow product currency action onOpen>` con la misma firma que `ProductCard`.

- [ ] **Step 1:** `ProductRow` según "Tarjeta Carta" del spec: sin foto no hay hueco; el área de texto es el botón "Ver {producto}"; la acción (`action`) a la derecha del precio; sin stock con etiqueta roja y sin acción. `grid` de `CatalogBrowser` usa `ProductRow` (1 columna, 2 desde 768 px) o `ProductCard` según `layout`; los resultados de búsqueda usan la misma forma.
- [ ] **Step 2:** `PriceBlock` con el precio en `text-brand` (en tarjetas y ficha). Verificar con la prueba de Task 2 que `brand` sobre blanco y sobre `brandPage` cumple AA.
- [ ] **Step 3:** `npm run check` → PASS; navegador: Alfa (gastronomía) en Carta, Beta (indumentaria) en Grilla, producto con opciones ("Elegir opciones de…"), sin stock y sin foto.
- [ ] **Step 4:** Commit `Rediseño 11b: tarjeta Carta y Grilla según el rubro`.

### Task 7: Aviso al agregar, barra del pedido y panel lateral

**Files:**
- Modify: `src/modules/orders/components/add-to-cart.tsx` (`useToast().show("Agregado al pedido")` al sumar desde 0)
- Modify: `src/modules/orders/components/ordering.tsx` (barra y clases del `<dialog>`)
- Modify: `src/app/sites/[host]/page.tsx` (envolver con `ToastProvider` de `@/ui/toast`)

- [ ] **Step 1:** Aviso solo cuando el producto pasa de 0 a 1 (no en cada `+`). El aviso queda por encima de la barra (la posición de `ToastProvider` ya deja 5,5 rem).
- [ ] **Step 2:** Barra flotante según el spec (`bg-foreground text-background`, radio 20, márgenes de 12 px, ícono de bolsa, "N productos · Tu pedido", total, "Ver pedido ›" en `bg-brand`). El `<button>` mantiene un nombre accesible que empieza con "Ver pedido · {count}" (por ejemplo `aria-label`).
- [ ] **Step 3:** `<dialog>` desde 768 px: `md:ml-auto md:mr-0 md:h-dvh md:max-h-none md:w-[440px] md:rounded-none md:rounded-l-2xl` (panel derecho); en el celular, igual que hoy.
- [ ] **Step 4:** `npm run check` → PASS; navegador: agregar un producto (aparece el aviso y la barra), abrir el pedido a 375 y a 1280 px, llegar hasta "Enviar pedido por WhatsApp" sin enviar.
- [ ] **Step 5:** Commit `Rediseño 11b: aviso al agregar, barra del pedido y panel lateral`.

### Task 8: Sistema visual, verificación completa y cierre

**Files:**
- Modify: `docs/design/sistema-visual.md` (sección "Catálogo público" y "Pedido"), `CLAUDE.md` (fila de la etapa 11 y "Catálogo público (cómo está armado)")

- [ ] **Step 1:** Documentar: letra sin serifa en el catálogo, colores derivados (`brandShades`, sin opción para el comercio), portada, tarjeta de estado, buscador fijo, Carta o Grilla por rubro (`catalogLayout`), barra y panel lateral del pedido.
- [ ] **Step 2:** `npm run db:reset`, `npm run db:test`, `npm run build`, `npm run check:build`, `npm run test:e2e` → todo en verde.
- [ ] **Step 3:** Con `next start` (configuración `next-start`): catálogo de Alfa y de Beta en sus hosts sin mezclarse; cambiar el color de Alfa en el panel y verlo en su catálogo.
- [ ] **Step 4:** Capturas a 375 y 1280 px, claro y oscuro, de Alfa (Carta) y Beta (Grilla).
- [ ] **Step 5:** Commit `Rediseño 11b: sistema visual al día`. Revisión final independiente; preguntar al usuario antes de subir.
