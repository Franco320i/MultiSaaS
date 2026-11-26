# Rediseño 11a: fundaciones del panel · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colores nuevos, títulos sin serifa en el panel y piezas comunes (botón, píldora, campos, esqueleto, aviso breve, cabecera), aplicadas al panel sin cambiar funciones.

**Architecture:** Tokens nuevos en `src/app/globals.css`; el panel gana `data-surface="panel"`, que redefine la familia de `font-display`. Piezas en `src/ui/` (las clases de botón y el mapa de estados son funciones puras con prueba unitaria). Después se reemplazan los botones y etiquetas hechos a mano del panel y sus módulos.

**Tech Stack:** Next.js 16.4 (App Router, `cacheComponents`), React 19.3, Tailwind 4 (`@theme inline`), Vitest (entorno node, `src/**/*.test.ts`), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-26-rediseno-fundaciones-design.md` (leerlo antes de cada tarea). Maqueta: https://claude.ai/artifact/D8cSUFFw5PeyimnFYh4fiH

## Global Constraints

- Textos de la interfaz en español rioplatense con voseo; **no cambiar ningún texto de botón** (los E2E los buscan por texto).
- Colores solo por token (`bg-accent-soft`, `text-info`…), nunca `bg-[#…]` ni grises de Tailwind.
- Botones: píldora (`rounded-full`), 44 px de alto en el celular; `sm` (36 px) solo con `md:` o en acciones de fila de escritorio.
- Contraste AA (4,5:1) en claro y en oscuro para todo texto.
- No tocar `/sites`, `(marketing)`, `/admin`, `add-to-cart.tsx` ni nada de `src/modules/*/components/storefront`.
- Un módulo nunca importa otro; `src/ui` no importa `core` ni módulos (ESLint lo verifica).
- Antes de usar una API de Next, leer su guía en `node_modules/next/dist/docs/`.
- `npm run check` tiene que pasar antes de cada commit (el hook lo exige). No hacer push sin permiso del usuario.

## Review Focus

1. **Modo oscuro:** cada token nuevo con valor oscuro; el aviso breve, las píldoras y el activo del menú legibles en oscuro.
2. **Catálogo intacto:** ninguna pantalla de `/sites` cambia de letra ni de color (Young Serif sigue en el nombre del comercio).
3. **Página principal intacta:** `accent-soft` sigue siendo el violeta claro dentro de `data-surface="marketing"` (títulos resaltados y foco).
4. **Botón enviando:** `SubmitButton` muestra "Guardando…" y queda apagado; doble toque no envía dos veces.
5. **Celular:** el aviso breve no queda tapado por el menú fijo de abajo ni por la barra del iPhone.

---

### Task 1: Colores nuevos y títulos sin serifa en el panel

**Files:**
- Modify: `src/app/globals.css` (`:root`, bloque oscuro, `@theme inline`)
- Modify: `src/app/panel/layout.tsx` (div raíz)

**Interfaces:**
- Produces: utilidades de Tailwind `bg/text/border-` para `accent-soft`, `accent-2`, `field`, `line-strong`, `warning-soft`, `info`, `info-soft`, `plum`, `plum-soft`, `whatsapp`; atributo `data-surface="panel"`.

- [ ] **Step 1:** Agregar en `:root` y en `@media (prefers-color-scheme: dark)` los valores de la tabla "Colores" del spec. `accent-soft` en `:root` pasa de `var(--accent)` a `#E4EEE6` (verificado: fuera de `(marketing)` nadie lo usa; `data-surface="marketing"` conserva `#c4b5fd`). Registrar cada token en `@theme inline` como `--color-<nombre>: var(--<nombre>)`.
- [ ] **Step 2:** Familia de títulos por superficie: en `:root` `--font-display-family: var(--font-young-serif)`; en `@theme inline` `--font-display: var(--font-display-family), ui-serif, Georgia, serif`; nuevo bloque `[data-surface="panel"] { --font-display-family: var(--font-hanken); }` y `[data-surface="panel"] .font-display { font-weight: 800; letter-spacing: -0.02em; }`.
- [ ] **Step 3:** En `src/app/panel/layout.tsx`, `data-surface="panel"` en el `<div>` raíz.
- [ ] **Step 4:** `npm run check` → PASS. `npm run dev`, abrir `app.localhost:3000/alfa` y `alfa.localhost:3000` en el navegador integrado: el título del panel sale en Hanken gruesa y el nombre del comercio del catálogo sigue en Young Serif; `localhost:3000` (página principal) sin cambios.
- [ ] **Step 5:** Commit `Rediseño 11a: colores nuevos y títulos sin serifa en el panel`.

### Task 2: Botón común

**Files:**
- Create: `src/ui/button-classes.ts`, `src/ui/button-classes.test.ts`, `src/ui/button.tsx`
- Modify: `src/ui/form.tsx` (`SubmitButton`)

**Interfaces:**
- Produces: `type ButtonVariant = "primary" | "secondary" | "soft" | "text" | "whatsapp" | "danger"`; `type ButtonSize = "md" | "sm"`; `buttonClasses(variant?: ButtonVariant, size?: ButtonSize, extra?: string): string` (por defecto `"primary"`, `"md"`); `<Button variant size className ...ButtonHTMLAttributes>`; `<ButtonLink href variant size className ...>` (con `next/link`).

- [ ] **Step 1: Prueba** `button-classes.test.ts`:
  - `buttonClasses()` contiene `rounded-full`, `min-h-11`, `bg-accent`, `text-accent-foreground` y `disabled:opacity-50`;
  - `buttonClasses("secondary")` contiene `border-line-strong` y `bg-surface`;
  - `buttonClasses("whatsapp")` contiene `bg-whatsapp`;
  - `buttonClasses("danger")` contiene `text-danger` y no contiene `bg-danger`;
  - `buttonClasses("primary", "sm")` contiene `min-h-9` y no `min-h-11`;
  - todas contienen `focus-visible:outline-accent`;
  - `extra` se agrega al final.
- [ ] **Step 2:** `npx vitest run src/ui/button-classes.test.ts` → FAIL (no existe).
- [ ] **Step 3:** Implementar `buttonClasses` según la tabla "Piezas" del spec (texto 15–16 px, peso 600, `inline-flex items-center justify-center gap-2`, `px-5`). Después, `button.tsx` (sin `"use client"`) con `Button` y `ButtonLink` usando `buttonClasses`, y `SubmitButton` con `buttonClasses("primary", "md", "w-full sm:w-auto")` (mantiene `pendingLabel` y `disabled={pending}`).
- [ ] **Step 4:** Prueba → PASS; `npm run check` → PASS.
- [ ] **Step 5:** Commit `Rediseño 11a: botón común`.

### Task 3: Píldora y estados del pedido

**Files:**
- Create: `src/ui/pill.tsx`
- Modify: `src/modules/orders/status.ts`, `src/modules/orders/components/order-parts.tsx`
- Test: `src/modules/orders/status.test.ts` (crear o extender si existe)

**Interfaces:**
- Produces: `type PillTone = "neutral" | "accent" | "warning" | "info" | "plum" | "danger"` y `<Pill tone children>` en `src/ui/pill.tsx` (28 px, punto `currentColor` + texto, fondo `*-soft` y texto del tono; `neutral` = `surface-muted` + `muted`; `accent` = `accent-soft` + `accent`); `STATUS_TONE: Record<OrderStatus, PillTone>` en `status.ts`.

- [ ] **Step 1: Prueba:** `STATUS_TONE` es `{ new: "warning", confirmed: "info", preparing: "plum", ready: "accent", completed: "neutral", cancelled: "danger" }` y tiene una entrada por cada valor de `STATUS_LABEL`.
- [ ] **Step 2:** Correr la prueba → FAIL.
- [ ] **Step 3:** Implementar `STATUS_TONE` (`status.ts` importa solo el tipo `PillTone` de `@/ui/pill`) y `Pill`; `StatusPill` pasa a `<Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill>`. Actualizar el comentario de `order-parts.tsx`.
- [ ] **Step 4:** Prueba → PASS; `npm run check` → PASS; en el navegador, `/alfa/pedidos` muestra Nuevo en ámbar y Confirmado en azul (seed: Alfa #1 y #2).
- [ ] **Step 5:** Commit `Rediseño 11a: píldora y colores de estado del pedido`.

### Task 4: Campos y esqueletos de carga

**Files:**
- Modify: `src/ui/form.tsx` (`inputClass`, `FormError`)
- Create: `src/ui/skeleton.tsx`
- Modify: los `fallback` de `src/app/panel/page.tsx`, `[tenant]/categorias/page.tsx`, `categorias/nueva/page.tsx`, `categorias/[id]/page.tsx`, `productos/nuevo/page.tsx` (hoy dicen "Cargando…")

**Interfaces:**
- Produces: `<Skeleton className?>` (un bloque `bg-surface-muted rounded-xl animate-pulse motion-reduce:animate-none`, `aria-hidden`) y `<FormSkeleton>` (título corto + 3 campos de 48 px + botón píldora, en un contenedor con `aria-busy="true"` y `aria-label="Cargando"`).

- [ ] **Step 1:** `inputClass`: `min-h-12 rounded-[14px] border border-line bg-field px-3.5 text-[16px]`, foco `focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none`, error con `aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-soft`. `Select` y `TextArea` usan la misma clase.
- [ ] **Step 2:** Crear `skeleton.tsx` y reemplazar los cinco `<p className="opacity-70">Cargando…</p>` por `<FormSkeleton />` o una lista de `<Skeleton>` según la forma de la pantalla.
- [ ] **Step 3:** `npm run check` → PASS; en el navegador, `/alfa/productos/nuevo` en claro y oscuro: campos en `field`, foco con anillo verde.
- [ ] **Step 4:** Commit `Rediseño 11a: campos y esqueletos de carga`.

### Task 5: Aviso breve

**Files:**
- Create: `src/ui/toast.tsx`
- Modify: `src/app/panel/layout.tsx` (envolver `children`), `src/modules/settings/components/fields.tsx` (el "Se guardó." en línea)

**Interfaces:**
- Produces: `"use client"`; `<ToastProvider>{children}</ToastProvider>`; `useToast(): { show(message: string, tone?: "ok" | "error"): void }`.

- [ ] **Step 1:** Implementar el proveedor: un aviso por vez, se va a los 3000 ms, `role="status"` y `aria-live="polite"`; píldora `bg-surface border-line` con la sombra "lift" de la maqueta; círculo `bg-accent` con ✓ o `bg-danger` con !. Posición fija abajo al centro: `bottom: calc(5.5rem + env(safe-area-inset-bottom))` en el celular (encima del menú de 64 px) y `md:bottom-6`.
- [ ] **Step 2:** `PanelLayout` envuelve `children` con `<ToastProvider>`. En `fields.tsx`, cuando el estado pasa a guardado, `show("Se guardó")` en un `useEffect` que depende del estado devuelto por la acción, en lugar del texto en línea. El error sigue en `FormError`.
- [ ] **Step 3:** `npm run check` → PASS; en el navegador (375 px), guardar en `/alfa/ajustes` muestra el aviso por encima del menú y se va solo.
- [ ] **Step 4:** Commit `Rediseño 11a: aviso breve`.

### Task 6: Menú con activo en verde claro y cabecera de pantalla

**Files:**
- Modify: `src/app/panel/[tenant]/_components/tenant-nav.tsx`
- Create: `src/ui/page-header.tsx`

**Interfaces:**
- Produces: `<PageHeader eyebrow?: string; title: string; description?: string; action?: ReactNode>`: sobretítulo `text-[12px] font-bold uppercase tracking-wide text-accent-2`, `<h1 className="font-display text-[28px]">`, bajada `text-muted`, `action` a la derecha alineada abajo. Se usa desde la parte 3.

- [ ] **Step 1:** En el ítem activo, cambiar `font-bold text-accent` por `font-bold text-accent bg-accent-soft` con `rounded-full` en el contenido del ítem (en el celular, una píldora alrededor de ícono + texto, no todo el ancho de la celda; en `md:`, píldora horizontal). Se mantienen `aria-current`, el número de pedidos nuevos y los 64 px de alto.
- [ ] **Step 2:** Crear `page-header.tsx`.
- [ ] **Step 3:** `npm run check` → PASS; capturas del menú a 375 y 1280 px, claro y oscuro.
- [ ] **Step 4:** Commit `Rediseño 11a: menú con activo en verde claro y cabecera de pantalla`.

### Task 7: Reemplazar botones hechos a mano

**Files (Modify):**
- `src/app/panel/layout.tsx` ("Salir"), `src/app/panel/[tenant]/page.tsx`, `[tenant]/configurar/page.tsx`, `[tenant]/pedidos/page.tsx`, `[tenant]/productos/page.tsx`, `[tenant]/productos/_components/products-browser.tsx`
- `src/modules/catalog/components/import-form.tsx`, `options-editor.tsx`, `product-form.tsx`, `specs-editor.tsx`
- `src/modules/orders/components/status-actions.tsx`
- `src/modules/settings/components/brand-form.tsx`, `fields.tsx`, `provision-form.tsx`, `publish-panel.tsx`

**Interfaces:**
- Consumes: `buttonClasses`, `Button`, `ButtonLink` (Task 2).

- [ ] **Step 1:** En cada archivo, cada `<button>`/`<Link>` con estilo de botón propio (`rounded-full bg-accent…`, `rounded-full border border-line…`) pasa a `Button`/`ButtonLink` o a `className={buttonClasses(...)}` con la variante que corresponda: acción principal → `primary`; con borde → `secondary`; "Borrar…" → `danger`; links tipo "Ver todos →" → `text`; lo que abre WhatsApp → `whatsapp`. Conservar textos, `type`, `name`, `formAction`, `aria-*` y el ancho (`w-full`, `sm:w-auto`) vía `extra`. Los botones flotantes ("+ Producto") conservan su posición fija y solo toman las clases de color y forma.
- [ ] **Step 2:** `grep -rnE "rounded-full (bg-accent|border border-line)" src/app/panel src/modules --include=*.tsx | grep -v storefront | grep -v add-to-cart` → sin resultados (o solo chips de filtro, que no son botones).
- [ ] **Step 3:** `npm run check` → PASS; recorrido en el navegador a 375 px: Inicio, Productos, formulario de producto (con opciones), Importar, Pedidos, detalle de pedido (cambiar estado), Mi local, `configurar?paso=publicar`.
- [ ] **Step 4:** Commit `Rediseño 11a: botones comunes en todo el panel`.

### Task 8: Sistema visual, verificación completa y cierre

**Files:**
- Modify: `docs/design/sistema-visual.md`, `CLAUDE.md` (fila de la etapa 11)

- [ ] **Step 1:** `sistema-visual.md`: sumar los tokens nuevos a la tabla de color (claro y oscuro); en Tipografía, "en el panel (`data-surface="panel"`) los títulos van en Hanken Grotesk 800 con −2 %"; nueva sección "Piezas comunes" (botón y variantes, píldora y tonos de estado, campos, aviso breve, esqueleto, cabecera de pantalla); en "Panel fácil", el activo del menú en `accent-soft`.
- [ ] **Step 2:** `npm run db:reset`, `npm run build`, `npm run check:build`, `npm run test:e2e` → todo en verde.
- [ ] **Step 3:** Capturas a 375 y 1280 px, claro y oscuro, de Inicio, Productos, Pedidos y Mi local, y del catálogo de Alfa para confirmar que no cambió.
- [ ] **Step 4:** `CLAUDE.md`: 11a hecha; sigue 11b (catálogo).
- [ ] **Step 5:** Commit `Rediseño 11a: sistema visual al día`. Preguntar al usuario antes de subir a `main` y `staging`.
