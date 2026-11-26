# Rediseño, parte 2 (11b): catálogo público

Fecha: 2026-11-26. Estado: aprobado por el usuario (letra sin serifa; Carta o Grilla según el rubro, **sin opción para cambiarla**). Maqueta: https://claude.ai/artifact/4iHpbqzH1iLeE6FP8vcyDZ (versiones 2 y 3).

## Para qué

El catálogo es lo que ven los compradores, casi siempre en el celular, desde Instagram o WhatsApp. El usuario tomó como modelo el catálogo de PPW (`docs/design/referencia-ppw.md`, secciones 1 a 5): se lee como la carta de un restaurante bueno, con la información del local ordenada en una sola tarjeta y el color del comercio en todo. Esta parte lleva esa estructura al catálogo de Vidri, sin cambiar cómo se pide.

## Objetivos

1. Títulos del catálogo **sin serifa** (Hanken Grotesk 800, −2 %), igual que el panel.
2. **Colores derivados del color del comercio:** segundo color (más oscuro), tinte suave y fondo de página apenas teñido. Calculados en el servidor, con contraste AA verificado por prueba para los 9 colores de la lista.
3. **Portada nueva:** foto con velo en diagonal o, sin foto, degradé del color al segundo color; logo redondo montado sobre el borde inferior; nombre y frase debajo, sobre el fondo de la página.
4. **Tarjeta de estado** en lugar de los chips sueltos y "Ver horarios": Estado (abierto ahora), Pedido mínimo, Hoy (horario, desplegable con la semana) y Envío.
5. **Buscador fijo** junto con las categorías al bajar.
6. **Secciones** con título de 24 px y una rayita del color del comercio.
7. **Dos formas de mostrar productos según el rubro:** Carta (fila con la foto a la derecha) o Grilla (la tarjeta de hoy, retocada).
8. **Precio en el color del comercio.**
9. **Al agregar:** aviso breve "Agregado al pedido"; barra del pedido oscura y flotante con cantidad, total y "Ver pedido"; en pantallas de 768 px o más, la hoja del pedido como panel lateral derecho.

## Fuera de esta parte (no hacer)

- **Que el comercio elija Carta o Grilla, el tema o los colores derivados.** Lo decide el rubro. No se agrega nada a Ajustes.
- Editor de diseño, temas con nombre, botón "Compartir", ampliación de fotos.
- Cambios en la base de datos o en `storefront_by_host`.
- Cambios en la ficha del producto, las opciones, el formulario del pedido o el mensaje de WhatsApp (salvo el panel lateral en escritorio).
- Página principal, panel y panel central.

## Antiobjetivos

- Que un texto quede por debajo de AA con alguno de los 9 colores de la lista.
- Romper la caché del catálogo (el color y la forma salen de datos ya cacheados por host; nada nuevo se lee de la petición).
- Que dejen de pasar los E2E del catálogo: se mantienen los nombres accesibles "Buscar en el catálogo", "Ver {producto}", "Elegir opciones de {producto}", "Agregar {producto} al pedido" y "Ver pedido · N".

## Decisiones

### Letra

`StorefrontView` pone `data-surface="storefront"` en su raíz. En `globals.css`, esa superficie redefine `--font-display-family` a Hanken, con peso 800 e interletrado −2 % para `.font-display` (la misma regla que el panel, compartida).

### Colores del comercio

- En `src/lib/color.ts`: `mixHex(a, b, weight)` (mezcla en sRGB) y `brandShades(brand)` → `{ brand2, tint, page }`:
  - `brand2` = brand mezclado con negro (más oscuro), para el degradé de la portada;
  - `tint` = brand mezclado con blanco (muy claro), para fondos de íconos, etiquetas y la franja;
  - `page` = brand mezclado con el fondo de Sobremesa (`#fbfbf9`), apenas teñido.
- Las proporciones exactas las fija la prueba: para cada color de `BRAND_PALETTE`, `brand` sobre `tint` ≥ 4,5, `brand` sobre `page` ≥ 4,5, `brand` sobre blanco ≥ 4,5 y blanco sobre `brand2` ≥ 4,5. `BRAND_PALETTE` se mueve de `src/modules/settings/schemas.ts` a `src/lib/` para que la prueba y el módulo lo compartan.
- `getStorefront` (`src/core/tenancy/storefront.ts`) agrega `brand2`, `brandTint` y `brandPage` al resultado (se calculan de `brand`, sin leer nada más). `StorefrontView` los expone como `--brand-2`, `--brand-tint` y `--brand-page`, registrados en `@theme inline`.
- **Modo oscuro:** el fondo teñido y las tarjetas blancas son solo del modo claro. En oscuro se usan `background` y `surface` de Sobremesa; el color del comercio sigue en botones, precio y píldora activa.

### Forma según el rubro

- `catalogLayout(templateKey: string): "carta" | "grilla"` en `src/modules/catalog/presentation.ts`: `gastronomia`, `dietetica` y `general` → `"carta"`; `indumentaria` y `tecnologia` → `"grilla"`; cualquier otro valor → `"carta"`.
- `template_key` ya viene en el `Storefront`. `StorefrontView` le pasa la forma a `CatalogBrowser`.

### Portada y tarjeta de estado

- Portada de 150 px en el celular (220 px desde 640 px): foto con `linear-gradient(135deg, rgb(14 16 12 / .55), rgb(14 16 12 / .15))` encima; sin foto, `linear-gradient(135deg, var(--brand), var(--brand-2))`.
- Logo de 76 px (88 px desde 640 px) con borde de 4 px del color de la página, montado 38 px sobre la portada. Sin logo: círculo del color del comercio con las iniciales del nombre (máximo 2) en blanco o tinta según `brandForeground`.
- Debajo: nombre (`font-display`, 28 px), frase en `muted` y una línea con la dirección y **"Cómo llegar"** (link del color del comercio con ícono de mapa).
- **Tarjeta de estado** (superficie blanca, radio 18, sombra suave, 2 columnas): cada dato con ícono SVG en un cuadrado `brand-tint` de 28 px, etiqueta chica en `muted` y valor en negrita.
  - **Estado:** `OpenStatus` tal como está (se calcula en el navegador, no entra en la caché).
  - **Pedido mínimo:** solo si es mayor que cero.
  - **Hoy:** el horario de hoy o "Cerrado hoy", con `<details>` que despliega la semana (lo que hoy muestra "Ver horarios"). Como "hoy" depende de la fecha, se calcula en el navegador igual que `OpenStatus`.
  - **Envío:** "$ 1.500", "Gratis" o "Solo retiro".
- Los medios de pago pasan a una línea chica debajo de la tarjeta ("Pagás con efectivo · transferencia"). "Todos los pedidos incluyen" queda como está, con el tinte del comercio.

### Buscador y categorías

- Un solo contenedor fijo (`sticky top-0`) con el buscador, "Ordenar" y las píldoras; fondo del color de la página con sombra suave cuando está pegado. Mientras se busca, las píldoras se ocultan (como hoy).
- Buscador de 48 px, radio 14, blanco con borde casi invisible. Píldoras de 40 px: inactivas sin borde y en `muted`, peso 650; la activa con el color del comercio y sombra teñida.

### Secciones

Título `font-display` de 24 px, descripción de la categoría en `muted` y una rayita de 28 × 3 px del color del comercio.

### Tarjeta "Carta" (`ProductRow`)

- Fila blanca, radio 18, borde casi invisible, padding 12. A la izquierda: nombre (15–16 px, negrita), etiquetas (`TagList`), descripción a 2 líneas en `muted`, y abajo el precio (color del comercio; el anterior tachado y chico arriba) con la acción a la derecha. A la derecha: la foto de 96 × 108 px, radio 13, con el fondo teñido mientras carga.
- **Sin foto: no hay hueco**, la fila queda solo con texto.
- Tocar la fila abre la ficha (botón "Ver {producto}", como hoy). Sin stock: etiqueta roja, foto atenuada, sin acción.
- Una columna en el celular, dos desde 768 px.

### Tarjeta "Grilla"

La `ProductCard` de hoy con el precio en el color del comercio, radio 16 y borde casi invisible.

### Agregar y pedido

- `AddToCartButton` (módulo pedidos) muestra el aviso breve "Agregado al pedido" con `useToast` cuando suma un producto desde la tarjeta o la ficha. La ruta del catálogo envuelve `StorefrontView` con `ToastProvider`.
- **Barra del pedido** (`ordering.tsx`): flotante (12 px de los bordes), radio 20, fondo `foreground` y texto `background` (se invierte solo en modo oscuro), con ícono de bolsa, "N productos · Tu pedido", "Total $ …" y el botón "Ver pedido ›" del color del comercio. El nombre accesible sigue empezando con "Ver pedido · N".
- **Hoja del pedido:** igual en el celular; desde 768 px, panel lateral derecho de 440 px a todo el alto, con el fondo oscurecido.

## Enfoques considerados

1. **Una sola plantilla con dos formas de tarjeta y colores derivados (elegido).** Respeta "plantilla única" y "sin editor": todo sale del color y del rubro que el comercio ya tiene.
2. Varias plantillas por rubro (como MyShp). Mucho más para mantener; el usuario lo descartó.
3. Que el comercio elija la forma en Ajustes. Descartado por el usuario.

## Cómo se verifica

- Pruebas unitarias: `mixHex`, `brandShades` (contraste de los 9 colores), `catalogLayout`, horario de hoy.
- `npm run check`, `npm run build`, `npm run check:build` y `npm run test:e2e` en verde.
- Navegador a 375 y 1280 px, claro y oscuro: Alfa (gastronomía → Carta) y Beta (ver su rubro; si es Carta, probar Grilla con un comercio de indumentaria creado en local o cambiando el rubro de prueba solo en la base local). Con y sin foto de portada, con y sin logo, producto sin foto, sin stock, con opciones, y el pedido completo hasta WhatsApp.
- Caché: con `next build` + `next start`, confirmar que el catálogo de Alfa no aparece en el host de Beta y que un cambio del panel se ve.
- `sistema-visual.md` actualizado: sección "Catálogo público".

## Lo que queda al constructor

Las proporciones exactas de mezcla (las que pasen la prueba), los íconos SVG que falten en `icons.tsx`, el orden de los cambios y cómo se calcula "hoy" en el navegador.
