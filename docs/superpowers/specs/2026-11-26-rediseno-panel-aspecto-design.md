# Rediseño, parte 3 (11c): aspecto del panel del comercio

Fecha: 2026-11-26. Estado: aprobado por el usuario ("Sí, así" sobre la maqueta), con un cambio posterior: **sin "Tu primer pedido"** (los catálogos los arma el usuario con "Pedí tu demo"; el dueño llega con todo listo). Maqueta: https://claude.ai/artifact/QirjsPxQJ1AiQjtamouq9B

## Para qué

El usuario quiere la **calma visual del panel de PPW** (`docs/design/referencia-ppw.md`, sección 6) en el panel de Vidri: cada pantalla empieza igual, pocos elementos, los números son atajos y las listas son filas finas. Esta parte cambia el **aspecto**; los recorridos (editar sin salir de la lista, estado en la fila, avisar por WhatsApp, Mi local como índice) son la parte 4 (11d).

## Objetivos

1. **Cabecera común** (`PageHeader` de `src/ui/page-header.tsx`, hecha en 11a) en Inicio, Productos, Categorías, Pedidos y Mi local: sobretítulo dorado, título, una línea que dice para qué sirve la pantalla y, si corresponde, una sola acción.
2. **Inicio igual para todos (dueño y staff) y siempre igual:** aviso de pedidos nuevos (si hay), **4 números** (pedidos del mes con la comparación, ventas del mes, productos con cuántos sin stock, el más pedido), la tarjeta del link y dos accesos rápidos.
3. **"Para completar"** en Mi local: la lista larga de hoy (`SetupChecklist`: WhatsApp, logo, horarios, producto publicado, 5 fotos, publicado) sale del Inicio y va arriba de Mi local mientras falte algo.
4. **Productos con contadores que filtran:** Todos, Sin stock, Sin categoría, Ocultos y una píldora por categoría, cada una con su número.
5. **Pedidos con dos recuadros arriba:** "Nuevos N · Para confirmar" (ámbar) y "Confirmados N · Por entregar" (azul), que llevan a su sección.
6. **Pendientes menores de 11a:** "Sí, cancelar" y "Sí, despublicar" con borde rojo; los dos interruptores con `bg-line` pasan a `bg-line-strong`; la píldora del menú no se sale de su celda a 320 px.

## Fuera de esta parte

- Cambios en la base de datos, en las Server Actions o en lo que hace cada botón.
- Editar productos en ventana, estado desde la fila, avisos por WhatsApp, Mi local como índice (11d).
- Catálogo público, página principal, panel central.
- Números nuevos que necesiten consultas nuevas en la base (por ejemplo, visitas).

## Antiobjetivos

- Cambiar permisos: Mi local sigue siendo del dueño (`settings.write`); si el usuario quiere al staff con todo, va con la pantalla de equipo y su cambio en RLS.
- Que dejen de pasar los E2E del panel (`panel.spec.ts`: el interruptor de stock desde la lista) y de aislamiento.
- Texto por debajo de AA o táctiles de menos de 44 px.

## Decisiones

### Inicio

- **Los 4 números** (`HomeStats`, componente de la ruta en `src/app/panel/[tenant]/_components/`), en una grilla de 2 × 2 con divisorias de 1 px (fondo `line` y celdas `surface`). Cada celda es un link con ↗:
  - **Pedidos del mes:** `monthOrders`, con la comparación de `describeOrderStats` (`change.text`, en verde si sube) → Pedidos.
  - **Ventas del mes:** `monthTotal` con `formatCents` y "Por WhatsApp" → Pedidos (terminados).
  - **Productos:** cantidad total y "N sin stock" (de la lista de productos del comercio, que ya se puede leer) → Productos.
  - **El más pedido:** `topProduct.name` y "N veces", o "Todavía no hay" → Productos.
- **Tarjeta del link** (`CatalogLinkCard`): bloque `accent` con la dirección del catálogo, **"Copiar link"** (componente cliente con `navigator.clipboard` y el aviso breve "Link copiado") y **"Compartir · QR"** → `configurar?paso=publicar`. Si el catálogo no está publicado: "Tu catálogo todavía no está publicado" y, para el dueño, "Publicar" → `configurar?paso=publicar`.
- **Accesos rápidos:** Cargar producto y Precios y stock, con el estilo de hoy, más compactos.
- Se quita del Inicio: `OrderStatsCard` (lo reemplazan los 4 números) y `SetupChecklist` (pasa a Mi local). El aviso "Tenés N pedidos nuevos" se mantiene, en `warning-soft`.

### Productos

- Se lee la lista completa del comercio una vez (hoy ya trae hasta 1000) y los contadores y el filtro se calculan en el servidor con funciones puras en `src/modules/catalog/presentation.ts`:
  - `productCounts(products)` → `{ all, outOfStock, uncategorized, hidden, byCategory: Map<id, n> }`;
  - `filterPanelProducts(products, filter)` con `filter` = `{ kind: "all" | "out" | "uncategorized" | "hidden" } | { kind: "category", id }`.
- Píldoras en este orden: Todos, Sin stock (con el número en ámbar si es > 0), Sin categoría, Ocultos y una por categoría. Las que dan 0 (salvo Todos) no se muestran. Parámetros de la dirección: los de hoy (`?categoria=`, `?ver=ocultos`) más `?ver=sin-stock`.
- La lista y el interruptor quedan como están (`ProductsBrowser`), con la cabecera común ("CATÁLOGO" · Productos · "Tocá uno para cambiarlo. El interruptor dice si hay stock." · botón "Más").

### Pedidos

- Dos recuadros (`warning-soft`/`info-soft`, radio 16) con el número grande, solo en "En curso": cada uno es un link a su sección (`#g-new`, `#g-confirmed`). Con 0, el recuadro se ve igual con "0".
- Cabecera común ("VENTAS" · Pedidos · "Mirá cada pedido antes de seguir la charla por WhatsApp.").

### Categorías y Mi local

- Cabecera común: "CATÁLOGO" · Categorías · "Así se ordenan en tu catálogo. Usá las flechas para mover." y "TU LOCAL" · Mi local · "Cómo se ve tu catálogo y cómo te encuentran tus clientes."
- Mi local muestra arriba `SetupChecklist` con el título "Para completar" mientras quede algo pendiente.

### Pendientes de 11a

- Variante nueva `danger-outline` en `buttonClasses` (borde `danger`, texto `danger`, sin fondo) para las confirmaciones finales: "Sí, cancelar" (`status-actions.tsx`) y "Sí, despublicar" (`publish-panel.tsx`).
- `products-browser.tsx` y `options-editor.tsx`: interruptor apagado en `bg-line-strong`.
- `tenant-nav.tsx`: píldora con `px-3` en el celular (`md:px-3.5` igual).

## Enfoques considerados

1. **Inicio fijo con los números del mes (elegido).** Con "Pedí tu demo" el comercio llega armado: no hace falta guiar primeros pasos.
2. Inicio que cambia con el primer pedido (guía de primeros pasos). Descartado por el usuario: sirve para el autoservicio, que no va a existir.
3. Números nuevos con consultas nuevas (visitas, semana). Más trabajo y base; no hacen falta ahora.

## Cómo se verifica

- Pruebas unitarias: `productCounts`, `filterPanelProducts`, `buttonClasses("danger-outline")`.
- `npm run check`, `npm run build`, `npm run check:build`, `npm run test:e2e`.
- Navegador a 375, 320 y 1280 px, claro y oscuro: Inicio de Alfa y de un comercio sin pedidos ni ventas (Gamma o uno creado en local), Productos con cada filtro, Pedidos, Categorías, Mi local como dueño y el Inicio como staff (`staff.alfa@example.com`).
- `sistema-visual.md` actualizado (Panel del comercio).

## Lo que queda al constructor

La forma exacta de los componentes, los íconos, cómo se reparte el código entre la ruta y los módulos (respetando las fronteras) y el texto de la tarjeta del link cuando no está publicado.
