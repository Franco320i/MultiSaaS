# Sistema visual: Sobremesa

Elegido el 15 de noviembre de 2026, al empezar la etapa 6, entre tres direcciones (Ticket, Vidriera y Sobremesa; maquetas en https://claude.ai/artifact/9xKgSbitX1sVTMEPjwYBca).

**Intención:** tranquilo y cuidado, como una carta de restaurante bien hecha. Mucho aire, títulos con serifa, fotos protagonistas. La plataforma es neutra para que en el catálogo brille el color de cada comercio.

Los tokens viven en `src/app/globals.css` (bloque `@theme` de Tailwind 4). Usalos por nombre (`bg-surface`, `text-muted`, `font-display`). No uses valores sueltos (`bg-[#...]`, `text-gray-500`).

## Color

| Token | Claro | Oscuro | Rol |
| --- | --- | --- | --- |
| `background` | `#FBFBF9` | `#141713` | Fondo de página |
| `surface` | `#FFFFFF` | `#1C201B` | Tarjetas, hojas, barras fijas |
| `surface-muted` | `#E8EFE7` | `#243026` | Zonas suaves: avatar, chips inactivos, esqueletos |
| `foreground` | `#22261F` | `#E9ECE6` | Texto principal |
| `muted` | `#5F6659` | `#A3AB9D` | Texto secundario (contraste AA sobre `background` y `surface`) |
| `line` | `#E3E6DF` | `#30362E` | Separadores y bordes |
| `accent` | `#3D6B47` | `#8FBF98` | Verde yerba: acción principal de la plataforma, foco |
| `accent-foreground` | `#FFFFFF` | `#10200F` | Texto sobre `accent` |
| `danger` | `#A8432F` | `#E08A75` | Sin stock, errores, borrar |
| `danger-soft` | `#F6E7E2` | `#3A2420` | Fondo de la etiqueta "Sin stock" |

- Los neutrales tiran apenas a verde, para que no se vean grises por defecto.
- Color con significado: verde = acción o disponible, rojo = sin stock, error o borrar. Nunca solo color: siempre con texto ("Sin stock").

### Color del comercio (solo catálogo)

- Cada comercio tiene un color de marca: `tenant_settings.theme.brand` (`#RRGGBB`). Si no lo cargó, se usa el de su plantilla (`business_templates.default_theme.brand`).
- En el catálogo se expone como `--brand` y `--brand-foreground`. El texto sobre la marca (blanco o tinta) se elige en el servidor para que cumpla AA (`src/lib/color.ts`).
- La marca se usa en: portada sin foto, pestaña activa de categorías y botones del catálogo. El texto corrido y los precios siempre van en `foreground`.

| Plantilla | Marca por defecto |
| --- | --- |
| Gastronomía | `#C2410C` |
| Indumentaria | `#9D174D` |
| Tecnología | `#1D4ED8` |
| Dietética | `#4D7C0F` |
| General | `#334155` |

## Tipografía

| Token | Fuente | Uso |
| --- | --- | --- |
| `font-display` | Young Serif | Títulos de página, nombre del comercio, títulos de sección del catálogo. Nunca en botones ni en texto chico. |
| `font-sans` | Hanken Grotesk | Todo lo demás: texto, botones, formularios, precios |

- Se cargan con `next/font/google` en `src/app/layout.tsx`.
- Precios y cantidades: `tabular-nums`.
- Escala: 13 (meta), 15 (texto), 17 (nombre de producto), 20 (título de sección), 28 (título de página) y 32 a 40 (nombre del comercio en la portada).
- Etiquetas en mayúsculas solo con `tracking-wide` y a 12 o 13 px.

## Formas

- Botón principal: píldora (`rounded-full`), alto mínimo de 44 px, uno solo por pantalla.
- Fotos de producto: `rounded-xl`. Miniaturas del panel: redondas.
- Pestañas: subrayado de 2 px, sin cajas.
- Casi sin bordes ni sombras. Las tarjetas se separan con aire o con una línea `line`. Sombra solo en lo que flota (barra inferior y hojas).

## Catálogo público

- Diseñado a 375 px. En pantallas grandes, una columna de hasta 672 px centrada (se lee como una carta, no como una tienda en grilla).
- Portada: foto del comercio o, si no tiene, un degradé de su color. Encima: nombre en `font-display`, frase y estado (abierto o cerrado).
- Categorías: barra fija arriba, con desplazamiento horizontal. Cada una lleva a su sección.
- Producto: nombre, descripción en 2 líneas, precio (y el anterior tachado si tiene) y foto cuadrada a la derecha. "Sin stock": etiqueta roja y el producto atenuado, pero visible.
- Sin datos de la plataforma arriba. La marca es la del comercio.

## Modo oscuro

- Se define en tokens con `prefers-color-scheme`. Cada componente usa tokens, así cambia solo.
- La marca del comercio no cambia en oscuro. Su texto sigue eligiéndose por contraste.

## Pendiente

- Llevar el panel a estos tokens (encabezado, listados como en la maqueta, estados vacíos). Va en un cambio aparte, no en la etapa 6.
- Variante compacta para el panel central (etapa 9).
