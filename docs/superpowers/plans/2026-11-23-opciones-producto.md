# Opciones del producto (parte 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Grupos de opciones por producto (obligatorios u opcionales, una o varias), elegidos en la ficha, con el precio calculado en la base y lo elegido en el carrito, WhatsApp y el panel de pedidos.

**Architecture:** Dos tablas nuevas (`catalog_option_groups`, `catalog_options`) con RLS. `private.create_order` (misma firma) recibe `option_ids` por línea, valida y suma adicionales, y guarda la copia en `order_items.options`. Lógica pura de elección y precio en `src/lib/product-options.ts` (la usan catálogo y pedidos sin importarse entre módulos). Carrito `pedido:v2` con `optionIds`.

**Spec:** `docs/superpowers/specs/2026-11-23-opciones-producto-design.md`

## Global Constraints

- Nombres 1–40, `price_delta` ≥ 0 en centavos, `max_choices` 1–20, hasta 5 grupos por producto y 20 opciones por grupo.
- El navegador nunca manda precios; `create_order` valida pertenencia (producto y comercio), disponibilidad, obligatorios y máximo.
- Errores públicos genéricos: `options_invalid` → "Revisá las opciones de «…»".
- Un producto sin grupos funciona exactamente como hoy (pedidos viejos y E2E existentes siguen pasando).

## Review Focus

1. Opción de otro producto u otro comercio en el pedido → rechazado (pgTAP Tarea 2).
2. Misma combinación con las opciones en distinto orden → una sola línea sumada (pgTAP Tarea 2 + unitaria de clave en Tarea 3).
3. Opción marcada agotada después de agregarla al carrito → error claro al enviar, no un pedido con la opción (pgTAP Tarea 2).
4. Carrito viejo `pedido:v1` en el celular de un cliente → se convierte sin perder productos (unitaria Tarea 3).
5. Grupo obligatorio sin opciones disponibles → el botón queda "Elegí …" y no se puede pedir (unitaria Tarea 3).

---

### Task 1: Tablas de opciones
- Migración `catalog_options` vía `npx supabase migration new catalog_options`: dos tablas (regla 2 y 3 de CLAUDE.md), FK compuestas con `on delete cascade`, índices `(tenant_id, product_id, position)` y `(tenant_id, group_id, position)`, `prevent_tenant_change`, triggers AFTER INSERT de límite (5 y 20), RLS (anon lee si el producto está publicado y el comercio es público; miembros todo), permisos por columna.
- `00_schema.test.sql`: sumar las dos tablas a la cobertura y a la lectura anónima.
- `supabase/tests/11_catalog_options.test.sql`: RLS por rol, FK cruzada (23503), límites (P0001), checks (23514), cascada al borrar producto.
- Seed: Alfa "Hamburguesa doble" con grupo "Tamaño" (obligatorio, una: Simple +0, Doble +1.500) y "Extras" (opcional, hasta 2: Panceta +800, Huevo +500 agotado). UUID fijos.
- `db:reset && db:test && db:lint && db:advisors && db:types`. Commit.

### Task 2: create_order con opciones
- Migración `orders_create_order_options`: `create or replace` de `private.create_order` y `private.order_summary` (suma `options` a cada ítem). Líneas agrupadas por `(product_id, option_ids ordenados)`.
- pgTAP en `05_orders.test.sql` (o archivo nuevo `12_orders_options.test.sql`): precio con adicionales; falta obligatorio; dos en grupo de una; pasa el máximo; opción de otro producto; de otro comercio; agotada; combinación repetida en otro orden se suma; combinaciones distintas en líneas distintas; producto sin grupos igual que hoy; `options` guardado.
- Commit.

### Task 3: Lógica pura compartida
- `src/lib/product-options.ts` + prueba: tipos `OptionGroup`, `validateSelection(groups, selectedIds) → {ok, missing?: groupName}`, `unitPrice(base, groups, selectedIds)`, `fromPrice(base, groups)` (mínimo con obligatorios), `lineKey(productId, optionIds)`, `optionsLabel(groups, ids)`.
- `cart-store.ts`: líneas `{productId, optionIds, quantity}`, clave `pedido:v2`, migración desde v1; `addLine`, `setLineQuantity(key, q)`. Prueba de la conversión y la clave.
- `whatsapp.ts`: ítem con `options` → "(Doble, Panceta)". Prueba.
- Commit.

### Task 4: Panel
- `modules/catalog`: queries `listOptionGroups(productId)`, mutations y actions (crear/renombrar/borrar/mover grupo; crear/editar/borrar/mover opción; interruptor "Hay"), todas con `requireTenantAccess(catalog.write)` + Zod + `revalidatePublicCatalog`.
- Componente `OptionsEditor` en la página del producto, debajo del formulario.
- Commit.

### Task 5: Catálogo y pedido
- `getPublicCatalog` con grupos y opciones; tarjeta "Desde $" y "Elegir"; ficha con grupos y botones; botón con precio o "Elegí …"; agregar línea con opciones.
- `Ordering`: líneas por combinación con su texto; `items` con `optionIds`; `orderRequestSchema` y `create.ts` con `option_ids`; `submit.ts` mapea `options_invalid`.
- Panel de pedidos: mostrar las opciones de cada línea.
- E2E: elegir tamaño y extra, agregar, carrito con la línea, WhatsApp con "(Doble, Panceta)". Integración: pedido real con opciones.
- Commit.

### Task 6: Cierre
- Docs (sistema visual, CLAUDE.md), `/auditoria-aislamiento`, suite completa, revisión, commit.
