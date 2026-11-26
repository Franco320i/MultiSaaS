# Rediseño 11d: recorridos del panel · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hoja para editar productos desde la lista, aviso al cambiar un pedido, Mi local como índice y QR descargable.

**Architecture:** Schema y mutación nuevos para la edición rápida (con pruebas unitarias y de integración). La hoja es un `<dialog>` de cliente con el patrón de historial de la ficha del catálogo. Mi local se arma con `?seccion=` en la misma página. El QR en PNG se genera en `src/lib/qr.ts`.

**Tech Stack:** Next.js 16.4, React 19.3, Tailwind 4, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-26-rediseno-panel-recorridos-design.md`

## Global Constraints

- Sin migraciones. Cada acción nueva lleva `requireTenantAccess` + Zod y escribe con el tenant verificado; las del catálogo terminan con `revalidatePublicCatalog`.
- Nombres que usan los E2E sin cambiar: interruptor "Hay stock/Sin stock" de la fila, "Guardar cambios" en la pantalla completa, "Confirmar pedido", "Marcar como entregado".
- Textos en español rioplatense, 44 px táctiles, AA en claro y oscuro, piezas de `src/ui/`.
- `npm run check` antes de cada commit; sin push sin permiso.

## Review Focus

1. Edición rápida de un producto con descripción, etiquetas y características: no se borran.
2. Hoja abierta → Atrás: se cierra y la lista sigue en el mismo filtro; guardar con error deja la hoja abierta con lo escrito.
3. Precio anterior menor que el precio: error en la hoja, sin guardar.
4. `?seccion=` raro → índice; staff en `/ajustes?seccion=marca` → 404 como hoy.
5. Descargar QR en el celular: el archivo es un PNG válido.

---

### Task 1: Edición rápida (schema, mutación, acción)

**Files:** `src/modules/catalog/schemas.ts` (+ test), `mutations.ts`, `actions.ts`, `tests/integration/catalog.test.ts`

**Interfaces:** Produces `productQuickSchema` / `type ProductQuick`; `updateProductBasics(supabase, tenantId, id, form: ProductQuick): Promise<MutationResult>`; `quickUpdateProductAction(slug, productId, prev: QuickEditState, formData): Promise<QuickEditState>` con `QuickEditState = FormState & { saved?: boolean }`.

- [ ] Prueba unitaria: el schema acepta los seis campos, ignora el resto y rechaza el precio anterior menor que el precio → FAIL → implementar → PASS.
- [ ] Prueba de integración: `updateProductBasics` sobre un producto con descripción y etiquetas cambia el precio y mantiene la descripción y las etiquetas; con el tenant de otro comercio devuelve "El producto no existe." → FAIL → implementar → PASS.
- [ ] Acción: devuelve `{ saved: true }` y llama a `refresh()` (sin redirigir).
- [ ] Commit `Rediseño 11d: edición rápida de productos`.

### Task 2: Hoja en la lista de productos

**Files:** `src/app/panel/[tenant]/productos/_components/quick-edit-sheet.tsx` (nuevo), `products-browser.tsx`, `productos/page.tsx`

- [ ] `ProductRow` suma `categoryId` y `compareAtPrice`; la página pasa `categories`.
- [ ] La fila pasa a ser un botón que abre `QuickEditSheet` (nombre accesible: "Editar {nombre}").
- [ ] La hoja: `<dialog>` + `history.pushState`, formulario con `useActionState(quickUpdateProductAction)`. Si guarda: aviso "Se guardó" y cierra. Si falla: error y los valores enviados. Link "Fotos, opciones y más".
- [ ] `npm run check`; navegador a 375 y 1280 px: abrir, guardar, Atrás, error de precio.
- [ ] Commit `Rediseño 11d: editar productos sin salir de la lista`.

### Task 3: Aviso al cambiar un pedido

**Files:** `src/modules/orders/components/status-actions.tsx` (+ prop `orderNumber`), `src/modules/orders/status.ts` (+ test), `pedidos/page.tsx`, `pedidos/[id]/page.tsx`

- [ ] Prueba: `statusToast(3, "confirmed")` = "Pedido #3 confirmado"; "completed" → "entregado"; "cancelled" → "cancelado" → FAIL → implementar → PASS.
- [ ] `StatusActions` muestra el aviso cuando la acción sale bien.
- [ ] Commit `Rediseño 11d: aviso al cambiar un pedido`.

### Task 4: Mi local como índice y QR descargable

**Files:** `src/app/panel/[tenant]/ajustes/page.tsx`, `src/lib/qr.ts`, `src/modules/settings/components/publish-panel.tsx`, `configurar/page.tsx`, `catalog-link-card.tsx`, `setup-checklist.tsx`, `src/modules/settings/` (función pura `parseSettingsSection` + test)

- [ ] Prueba: `parseSettingsSection("marca")` = "marca"; `undefined`, `"x"` y arrays → null → FAIL → implementar → PASS.
- [ ] `qrPngDataUri(url)` en `src/lib/qr.ts` (PNG de 1024 px) con prueba (empieza con `data:image/png;base64,`).
- [ ] `PublishPanel` recibe `qrPngDataUri` y `downloadName`; botón "Descargar QR" (`<a download>`).
- [ ] Índice y secciones en `ajustes/page.tsx`; links de "Compartir · QR" y del pendiente "Catálogo publicado" a `?seccion=link`.
- [ ] `npm run check`; navegador: índice, cada sección, descarga.
- [ ] Commit `Rediseño 11d: Mi local por secciones y QR para descargar`.

### Task 5: Verificación y cierre

- [ ] `sistema-visual.md` (hoja de edición, índice de Mi local), `CLAUDE.md` (11d hecha, sigue 11e).
- [ ] `db:reset`, `db:test`, `test:integration`, `build`, `check:build`, `test:e2e` → verde. E2E nuevo: abrir la hoja de un producto de Alfa, cambiar el precio, guardar, ver el aviso y volver al precio original.
- [ ] Commit, revisión final independiente, preguntar antes de subir.
