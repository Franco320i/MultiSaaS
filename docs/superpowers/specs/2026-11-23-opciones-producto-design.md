# Opciones del producto: talles, tamaños y extras (parte 3)

Fecha: 2026-11-23 · Estado: aprobada por el usuario (2026-11-23)

Parte 3 de 4 del catálogo para Base y Pro (orden en `2026-11-22-tarjeta-resultados-design.md`). Base y Pro la tienen.

## Por qué

Sin opciones, una tienda de ropa no puede vender (falta el talle) y una hamburguesería tiene que cargar "Simple", "Doble" y "Triple" como productos separados. Con opciones, el cliente elige en la ficha y el pedido llega a WhatsApp con lo elegido.

## Qué se construye

### Para el dueño (panel)

- En la página del producto, un bloque nuevo **"Opciones"** debajo de "Más detalles", que se guarda solo (como las fotos), sin tocar "Guardar cambios".
- Se arman **grupos** ("Talle", "Tamaño", "Extras") y en cada uno las **opciones** ("M", "Doble +$ 1.500", "Panceta +$ 800").
- Por grupo: **obligatorio u opcional** y **se elige una o varias** (con un máximo, por ejemplo "hasta 3 extras").
- Por opción: nombre, **precio adicional** (0 si no suma) y un interruptor **"Hay"** para marcarla agotada sin borrarla.
- Ordenar grupos y opciones con flechas grandes. Límites: hasta 5 grupos por producto y 20 opciones por grupo.
- Textos de ayuda con ejemplos ("Ej.: Talle, Tamaño, Extras").

### Para el cliente (catálogo)

- La tarjeta de un producto con opciones muestra **"Desde $ 9.000"** si alguna opción suma precio, y su botón dice **"Elegir"**: abre la ficha. Los productos sin opciones se agregan directo, como hoy.
- En la ficha, cada grupo con su nombre y si es obligatorio ("Elegí 1" o "Opcional · hasta 3"); las opciones como **botones tocables** con el adicional ("Doble +$ 1.500"). Agotadas: tachadas y sin poder elegirse.
- El botón de abajo se actualiza: **"Agregar · $ 10.500"**, o **"Elegí un tamaño"** (deshabilitado) mientras falte algo obligatorio.
- Al agregar, queda marcado "Agregado" y se puede sumar otra combinación.
- En el carrito, cada combinación es una línea propia: "Hamburguesa doble · Doble, Panceta" con su precio y su `− cantidad +`.

### En el pedido

- Mensaje de WhatsApp: `1 x Hamburguesa doble (Doble, Panceta) - $ 10.500`.
- Panel de pedidos: cada línea muestra lo elegido.

## Cómo se construye

- **Base (con `/nueva-tabla` y pgTAP):**
  - `catalog_option_groups`: `tenant_id`, `id`, `product_id` (FK compuesta a `catalog_products`, `on delete cascade`), `name` (1–40), `required`, `max_choices` (1 = se elige una; 2–20 = varias), `position`.
  - `catalog_options`: `tenant_id`, `id`, `group_id` (FK compuesta, `on delete cascade`), `name` (1–40), `price_delta` (`bigint`, centavos, ≥ 0), `is_available`, `position`.
  - Las dos con todo lo de la regla 2 y 3 de CLAUDE.md: `unique (tenant_id, id)`, índices por `tenant_id`, `prevent_tenant_change`, RLS por operación (dueño y staff escriben, como el producto; anónimo lee solo si el producto está publicado y el comercio es público), permisos por columna, límites de 5 grupos y 20 opciones por trigger.
- **`private.create_order` (nueva versión, misma firma):** cada línea trae `option_ids`. La base:
  - agrupa por producto + opciones elegidas (la misma combinación repetida se suma);
  - verifica que cada opción sea de ese producto y de ese comercio, que esté disponible, que se cumplan los obligatorios y el máximo de cada grupo;
  - calcula el precio unitario = precio del producto + adicionales, **sin leer precios del navegador**;
  - guarda en `order_items.options` (columna que ya existe) la copia de lo elegido (`[{group, name, price_delta}]`), igual que hoy guarda el nombre del producto.
  - Errores genéricos: `options_invalid` → "Revisá las opciones de «…»"; una opción agotada se informa como hoy un producto no disponible.
- **Navegador:** el carrito pasa a guardar `{productId, optionIds, quantity}` (clave nueva `pedido:v2`; lo guardado en `pedido:v1` se convierte a líneas sin opciones). El precio que muestra es solo informativo; el que vale lo calcula la base.
- **Catálogo público:** `getPublicCatalog` trae grupos y opciones (sigue cacheado por comercio; cada acción de opciones invalida el catálogo con `revalidatePublicCatalog`).
- **Panel:** acciones con `requireTenantAccess(slug, "catalog.write")` + Zod; el producto se busca con el `tenantId` verificado.

## Pruebas

- **pgTAP:** RLS de las dos tablas por rol (dueño, staff, otro comercio, anónimo, sin comercio); FK compuesta rechaza una opción de otro comercio; límites de 5 y 20; `create_order` con opciones válidas (precio con adicionales), sin el obligatorio, con dos en un grupo de una, pasando el máximo, con una opción de otro producto, de otro comercio, agotada; misma combinación repetida se suma; combinaciones distintas quedan en líneas distintas; un producto sin grupos sigue igual que hoy.
- **Integración:** crear un pedido real con opciones y un precio inventado en el pedido (se ignora).
- **Unitarias:** cálculo del precio mostrado, validación de lo elegido en la ficha, clave de línea del carrito, conversión de `pedido:v1`, texto de WhatsApp con opciones.
- **E2E:** elegir talle y extra en la ficha, agregar, ver la línea en el carrito y el mensaje de WhatsApp con las opciones; el pedido de siempre (sin opciones) sigue pasando.

## Fuera de esta parte

- Stock por talle o color (cantidades): una opción solo se marca "Hay / No hay".
- Fotos distintas por color.
- Precio propio por combinación (cada opción suma su adicional).
- Opciones que restan precio.
- Combos (parte 4).

## Enfoques considerados

1. **Grupos y opciones en tablas propias, precio calculado en la base (elegido).** Se valida todo en la base, como los precios de hoy; las opciones se pueden marcar agotadas y reordenar.
2. Opciones guardadas como JSON dentro del producto: menos tablas, pero `create_order` tendría que validar un JSON libre y no se pueden poner restricciones ni RLS por opción.
3. Cada combinación como un producto aparte (variantes): sirve para stock por talle, pero multiplica productos (S/M/L × 3 colores = 9) y complica el panel; no hace falta hoy.

## Decisiones mías para revisar

- El bloque "Opciones" va aparte, debajo de "Más detalles", y se guarda solo (no dentro del formulario con "Guardar cambios"): así agregar una opción no obliga a guardar todo el producto.
- Adicionales solo positivos o cero.
- Límites: 5 grupos por producto, 20 opciones por grupo.
- "Desde $ …" en la tarjeta cuando alguna opción obligatoria suma precio.
