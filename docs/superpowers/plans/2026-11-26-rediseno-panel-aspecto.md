# Rediseño 11c: aspecto del panel · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cabecera común en las pantallas del panel, Inicio nuevo (igual para todos, con los 4 números del mes), "Para completar" en Mi local, Productos con contadores que filtran, Pedidos con recuadros y los pendientes menores de 11a.

**Architecture:** Funciones puras (contadores y filtro de productos, variante de botón) con prueba; componentes de la ruta en `src/app/panel/[tenant]/_components/`. Sin cambios en la base ni en las acciones.

**Tech Stack:** Next.js 16.4, React 19.3, Tailwind 4, Vitest (node), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-26-rediseno-panel-aspecto-design.md`. Maqueta: https://claude.ai/artifact/QirjsPxQJ1AiQjtamouq9B

## Global Constraints

- Sin cambios en la base, en las Server Actions ni en lo que hace cada botón. Mi local y "Para completar" siguen siendo solo del dueño (`settings.write`).
- Un módulo no importa otro: lo que combina pedidos y catálogo (los 4 números) vive en la ruta.
- Textos en español rioplatense; nombres accesibles que usan los E2E sin cambiar (botones de stock "Hay stock/Sin stock" de la lista, "Guardar cambios", "Confirmar pedido", "Marcar como entregado").
- Tokens y piezas de `src/ui/` (botón, píldora, cabecera, aviso breve); 44 px en el celular; AA en claro y oscuro.
- `npm run check` antes de cada commit; sin push sin permiso.

## Review Focus

1. **Staff:** el Inicio del staff es igual al del dueño salvo enlaces a Mi local o Publicar, que no tiene; Mi local sigue 404 para el staff.
2. **Comercio sin pedidos ni productos:** el Inicio muestra 0 y "Todavía no hay" sin errores (stats nulos, sin producto más pedido).
3. **Catálogo no publicado:** la tarjeta del link no muestra una dirección que no funciona.
4. **Filtro por la dirección:** `?ver=sin-stock`, `?categoria=sin`, `?categoria={id}` y `?ver=ocultos` dan la lista correcta; un valor raro cae en "Todos".
5. **Copiar link sin permiso de portapapeles:** no rompe; avisa con el aviso breve de error.

---

### Task 1: Pendientes de 11a

**Files:** `src/ui/button-classes.ts` (+ test), `src/modules/orders/components/status-actions.tsx`, `src/modules/settings/components/publish-panel.tsx`, `src/app/panel/[tenant]/productos/_components/products-browser.tsx`, `src/modules/catalog/components/options-editor.tsx`, `src/app/panel/[tenant]/_components/tenant-nav.tsx`

**Interfaces:** Produces `ButtonVariant` suma `"danger-outline"`.

- [ ] **Step 1: Prueba:** `buttonClasses("danger-outline")` contiene `border-danger`, `text-danger` y `px-5`, y no contiene `bg-danger`.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar la variante (relleno de tamaño normal, borde 1 px). Usarla en "Sí, cancelar" y "Sí, despublicar". Interruptores apagados en `bg-line-strong`. Píldora del menú `px-3 md:px-3.5`.
- [ ] **Step 4:** Prueba → PASS; `npm run check` → PASS.
- [ ] **Step 5:** Commit `Rediseño 11c: pendientes menores de 11a`.

### Task 2: Contadores y filtro de productos

**Files:** `src/modules/catalog/presentation.ts` (+ test), `src/app/panel/[tenant]/productos/page.tsx`

**Interfaces:**
- Produces: `type PanelProductFilter = { kind: "all" | "out" | "uncategorized" | "hidden" } | { kind: "category"; id: string }`; `parsePanelProductFilter(params: { categoria?: string; ver?: string }): PanelProductFilter`; `productCounts(products: { category_id: string | null; is_available: boolean; is_published: boolean }[]): { all: number; outOfStock: number; uncategorized: number; hidden: number; byCategory: Map<string, number> }`; `filterPanelProducts<T>(products: T[], filter): T[]` (mismo tipo de entrada que `productCounts`).

- [ ] **Step 1: Pruebas:**
  - `parsePanelProductFilter`: `{}` → all; `{ ver: "sin-stock" }` → out; `{ ver: "ocultos" }` → hidden; `{ categoria: "sin" }` → uncategorized; `{ categoria: <uuid> }` → category; `{ categoria: "x" }` y `{ ver: "x" }` → all.
  - `productCounts` con 4 productos de ejemplo (uno sin stock, uno sin categoría, uno oculto, dos de la misma categoría) devuelve los números esperados; "sin stock" cuenta solo los publicados.
  - `filterPanelProducts` devuelve exactamente los de cada filtro.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar. En la página: leer todos los productos una vez (`listProducts` sin filtro), contar, filtrar en memoria, píldoras en el orden del spec (las de 0 ocultas salvo Todos), número en cada píldora, `PageHeader` ("Catálogo" · Productos · bajada · botón "Más"). "Para cambiar el orden, elegí una categoría arriba" se mantiene solo con filtro de categoría.
- [ ] **Step 4:** Pruebas → PASS; `npm run check` → PASS; navegador: cada filtro de Alfa.
- [ ] **Step 5:** Commit `Rediseño 11c: productos con contadores que filtran`.

### Task 3: Inicio nuevo

**Files:**
- Create: `src/app/panel/[tenant]/_components/home-stats.tsx`, `catalog-link-card.tsx`, `copy-link-button.tsx` (cliente)
- Modify: `src/app/panel/[tenant]/page.tsx`

- [ ] **Step 1:** `CatalogLinkCard` (bloque `accent`, dirección, `CopyLinkButton` con `useToast` — "Link copiado" o, si falla el portapapeles, "No se pudo copiar: mantené apretado el link" en error — y "Compartir · QR"); sin publicar: texto y, para el dueño, "Publicar".
- [ ] **Step 2:** `HomeStats` (2 × 2 con divisorias de 1 px, cada celda link con ↗, datos del spec; "Todavía no hay" sin producto más pedido).
- [ ] **Step 3:** `page.tsx`: `PageHeader` ("Tu local" · nombre · "Cómo va {mes}."); aviso de pedidos nuevos en `warning-soft`; `HomeStats`; tarjeta del link; accesos (Cargar producto, Precios y stock). Datos: `getOrderStats` y conteo de productos y sin stock. Se quitan `OrderStatsCard` y `SetupChecklist` del Inicio. Esqueleto acorde.
- [ ] **Step 4:** `npm run check` → PASS; navegador 375/1280, claro/oscuro: Alfa; un comercio sin pedidos (Gamma o uno local); staff de Alfa.
- [ ] **Step 5:** Commit `Rediseño 11c: Inicio nuevo`.

### Task 4: Cabeceras de Pedidos, Categorías y Mi local; "Para completar"

**Files:** `src/app/panel/[tenant]/pedidos/page.tsx`, `src/app/panel/[tenant]/categorias/page.tsx`, `src/app/panel/[tenant]/ajustes/page.tsx`

- [ ] **Step 1:** Pedidos: `PageHeader` y, en "En curso", los dos recuadros (links a `#g-new` / `#g-confirmed`; las secciones ya tienen esos `id`).
- [ ] **Step 2:** Categorías: `PageHeader` con el link "← Productos" de hoy arriba.
- [ ] **Step 3:** Mi local: `PageHeader` ("Tu local" · Mi local · bajada) y `SetupChecklist` con título "Para completar" arriba mientras haya pendientes (no se muestra si está todo hecho).
- [ ] **Step 4:** `npm run check` → PASS; navegador de las tres pantallas.
- [ ] **Step 5:** Commit `Rediseño 11c: cabeceras y Para completar`.

### Task 5: Sistema visual, verificación completa y cierre

**Files:** `docs/design/sistema-visual.md`, `CLAUDE.md`

- [ ] **Step 1:** Documentar en "Panel del comercio": cabecera común, Inicio con 4 números, tarjeta del link, contadores de Productos, recuadros de Pedidos, `danger-outline`.
- [ ] **Step 2:** `npm run db:reset`, `npm run db:test`, `npm run build`, `npm run check:build`, `npm run test:e2e` → verde.
- [ ] **Step 3:** `CLAUDE.md`: 11c hecha, sigue 11d.
- [ ] **Step 4:** Commit `Rediseño 11c: sistema visual al día`. Revisión final independiente; preguntar antes de subir.
