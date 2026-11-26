# Rediseño, parte 1: fundaciones del panel

Fecha: 2026-11-26. Estado: aprobado por el usuario (títulos B, lo elegido en verde claro). Maqueta: https://claude.ai/artifact/D8cSUFFw5PeyimnFYh4fiH

## Para qué

El usuario decidió rediseñar Vidri tomando la **estructura de PPW** (simple, limpia, entendible) con los colores de Vidri, y algunos recorridos de MyShp (`docs/design/referencia-ppw.md`, `docs/design/referencia-myshp.md`). El rediseño va en 5 partes (ver la etapa "Rediseño" en `CLAUDE.md`). Esta primera parte pone las **bases** sobre las que se apoyan las demás: colores, letra de los títulos y piezas comunes. Hoy cada pantalla arma sus botones y etiquetas a mano (más de 10 copias parecidas), y por eso el panel se ve desparejo.

## Objetivos

1. Sumar a Sobremesa los colores que faltan, con valores para claro y oscuro.
2. Títulos del panel **sin serifa** (Hanken Grotesk gruesa), como la opción B de la maqueta.
3. Una sola versión de cada pieza común en `src/ui/`: botón, píldora de estado, cabecera de pantalla, aviso breve, esqueleto de carga y campos.
4. Reemplazar los botones y etiquetas hechos a mano del panel por esas piezas.
5. Menú del panel con la sección activa en **verde claro con texto verde**.
6. Documentarlo en `docs/design/sistema-visual.md`.

## Fuera de esta parte

- No se reordenan pantallas ni cambia ninguna función (eso es la parte 3: cabecera en todas, Inicio nuevo, listas en filas).
- No se tocan el catálogo público (`/sites`), la página principal (`(marketing)`), el panel central (`/admin`) ni el registro. El catálogo decide su letra en la parte 2.
- Sin cambios en la base de datos.

## Antiobjetivos

- Que algún texto quede con contraste menor a AA en claro u oscuro.
- Que un botón quede por debajo de 44 px de alto en el celular.
- Que se rompa una prueba E2E por cambiar textos de botones (los textos no cambian).

## Decisiones

### Colores (tokens en `src/app/globals.css`)

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `accent-soft` | `#E4EEE6` | `#25352A` | Fondo de lo elegido (menú, filtro), avisos de ayuda, estado "Listo" |
| `accent-2` | `#8C5F27` | `#D9AE6E` | Dorado: solo sobretítulos y detalles chicos |
| `field` | `#F4F6F2` | `#20251F` | Fondo de los campos |
| `line-strong` | `#BCC3B6` | `#4A5246` | Borde del botón secundario, interruptor apagado |
| `warning-soft` | `#FBF0DC` | `#3A2E19` | Fondo ámbar (estado "Nuevo", avisos) |
| `info` / `info-soft` | `#2F5E9E` / `#E7EFFA` | `#9DBDF0` / `#1E2A3D` | Estado "Confirmado" |
| `plum` / `plum-soft` | `#6B4C93` / `#F0EAF8` | `#C9B0EC` / `#2D2440` | Estado "Preparando" |
| `whatsapp` | `#1A7D45` | `#1A7D45` | Solo botones que abren WhatsApp, con texto blanco (5,2:1; en oscuro se mantiene igual) |

`warning` ya existe (`#8A5A12` / `#E5B86B`). Los demás tokens de Sobremesa no cambian.

**Cuidado con `accent-soft`:** hoy vale lo mismo que `accent` en claro y en la página principal ("Noche") es un violeta claro que se usa como **color de texto**. Antes de cambiarlo, buscar todos sus usos (`accent-soft`) fuera de `(marketing)`: si alguno lo usa como texto, pasarlo a `accent`. `data-surface="marketing"` y `data-surface="admin"` mantienen sus propios valores.

### Títulos sin serifa solo en el panel

- El panel gana su superficie: `data-surface="panel"` en el layout del panel (`src/app/panel/layout.tsx`), igual que ya hacen `admin` y `marketing`.
- Dentro de esa superficie, `font-display` pasa a ser **Hanken Grotesk peso 800 con interletrado −2 %**. El catálogo, la página principal y los correos siguen con Young Serif.
- Cómo se logra (decisión del constructor): una variable de familia tipográfica que `@theme` lea y que `[data-surface="panel"]` redefina, más peso e interletrado para `.font-display` dentro de esa superficie. Así no hay que tocar cada uno de los 23 lugares que usan `font-display` en el panel y sus módulos.
- Revisar que ningún componente del catálogo público se dibuje dentro del panel (por ejemplo, una vista previa en "Publicar"); si lo hay, que mantenga Young Serif.

### Piezas en `src/ui/`

| Pieza | Qué es | Detalles |
| --- | --- | --- |
| `button.tsx` | `buttonClasses(variant, size)`, `<Button>` y `<ButtonLink>` (con `next/link`) | Variantes: `primary` (verde), `secondary` (blanco con `line-strong`), `soft` (`surface-muted`), `text` (verde sin fondo), `whatsapp`, `danger` (rojo sin fondo). Tamaños: `md` 44 px (por defecto) y `sm` 36 px solo para acciones de fila en pantallas de 768 px o más. Píldora siempre. Apagado: opacidad 50 %. Foco visible con `accent` |
| `pill.tsx` | `<Pill tone>` | Tonos: `neutral`, `accent`, `warning`, `info`, `plum`, `danger`. 28 px, punto + texto, nunca solo color |
| `page-header.tsx` | `<PageHeader eyebrow title description action>` | Sobretítulo dorado en mayúsculas 12 px, título `font-display` 28 px, bajada en `muted`, una acción a la derecha |
| `toast.tsx` | Aviso breve (cliente): proveedor + `useToast()` | Píldora en `surface` con sombra "lift", abajo al centro, por encima del menú del celular; tilde verde o signo rojo; se va sola a los 3 s; `role="status"` |
| `skeleton.tsx` | `<Skeleton>` | Bloques `surface-muted` con pulso; sin animación con `prefers-reduced-motion` |
| `form.tsx` (ya existe) | Campos | `bg-field`, borde `line`, radio 14, alto 48, foco con anillo `accent` al 20 %, error en `danger` sobre `danger-soft` con la ayuda en rojo. `SubmitButton` pasa a usar `buttonClasses("primary")` |

Las píldoras de estado de pedido (`StatusPill` en `src/modules/orders/components/order-parts.tsx`) usan `<Pill>`: `new` ámbar, `confirmed` azul, `preparing` violeta, `ready` verde claro, `completed` neutro, `cancelled` rojo.

### Dónde se aplican en esta parte

- Botones hechos a mano del panel y sus módulos (lista inicial: `panel/layout.tsx`, `[tenant]/page.tsx`, `configurar`, `pedidos`, `productos` y `products-browser`; `catalog/components` import-form, options-editor, product-form, specs-editor; `orders/components/status-actions`; `settings/components` brand-form, fields, provision-form, publish-panel). **No** `add-to-cart.tsx` ni lo que vive en `/sites`: es el catálogo.
- `tenant-nav.tsx`: activo con `bg-accent-soft text-accent` (hoy solo texto verde).
- `<PageHeader>` y `<Toast>` quedan listas pero se usan recién en las partes 3 y 4, salvo donde hoy ya hay un mensaje "Se guardó" en línea (reemplazarlo por el aviso breve si es directo).
- `<Skeleton>`: en los `fallback` de `<Suspense>` del panel que hoy muestran texto o nada.

## Enfoques considerados

1. **Piezas comunes + reemplazo en el panel (elegido).** Bases parejas antes de rediseñar pantallas; las partes siguientes solo componen.
2. Rediseñar pantalla por pantalla sin piezas comunes. Más rápido para ver algo distinto, pero repite estilos y vuelve a dejar el panel desparejo.
3. Cambiar `font-display` para toda la app. Más simple, pero cambia el catálogo y la página principal antes de decidirlos.

## Cómo se verifica

- `npm run check`, `npm run build`, `npm run check:build` y `npm run test:e2e` en verde.
- Pruebas unitarias para `buttonClasses` y el mapa de estado → tono.
- Navegador integrado a 375 y 1280 px, claro y oscuro: Inicio, Productos, formulario de producto, Pedidos, detalle de pedido, Mi local y el asistente (`configurar`). Capturas antes y después.
- Contraste AA de los colores nuevos (texto sobre su fondo suave y blanco sobre `whatsapp`).
- `sistema-visual.md` actualizado: tokens, títulos del panel, botones, estados y piezas.

## Lo que queda al constructor

El orden de los reemplazos, los nombres internos, cómo se arma la variable tipográfica y si el aviso breve reemplaza algún mensaje existente en esta parte o espera a la parte 4.
