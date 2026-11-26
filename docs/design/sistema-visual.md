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
| `accent-soft` | `#E4EEE6` | `#25352A` | Lo elegido (menú, filtro, opción marcada) con texto `accent`; estado "Listo" |
| `accent-2` | `#8C5F27` | `#D9AE6E` | Dorado: solo sobretítulos de pantalla y detalles chicos |
| `field` | `#F4F6F2` | `#20251F` | Fondo de los campos |
| `line-strong` | `#BCC3B6` | `#4A5246` | Borde del botón secundario, interruptor apagado |
| `warning` / `warning-soft` | `#8A5A12` / `#FBF0DC` | `#E5B86B` / `#3A2E19` | Ámbar: pedido nuevo, avisos |
| `info` / `info-soft` | `#2F5E9E` / `#E7EFFA` | `#9DBDF0` / `#1E2A3D` | Azul: pedido confirmado |
| `plum` / `plum-soft` | `#6B4C93` / `#F0EAF8` | `#C9B0EC` / `#2D2440` | Violeta: pedido en preparación |
| `whatsapp` | `#1A7D45` | `#1A7D45` | Solo botones que abren WhatsApp, con texto blanco (5,2:1) |

Los tokens de la tabla desde `accent-soft` se sumaron el 2026-11-26 (rediseño 11a, `docs/superpowers/specs/2026-11-26-rediseno-fundaciones-design.md`).

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
- **En el panel del comercio** (`data-surface="panel"` en `src/app/panel/layout.tsx`), `font-display` es **Hanken Grotesk 800 con interletrado −2 %** (decidido el 2026-11-26, más limpio, estilo PPW). El catálogo, la página principal y el panel central siguen con Young Serif. Se logra redefiniendo `--font-display-family` en esa superficie (`globals.css`).
- Precios y cantidades: `tabular-nums`.
- Escala: 13 (meta), 15 (texto), 17 (nombre de producto), 20 (título de sección), 28 (título de página) y 32 a 40 (nombre del comercio en la portada).
- Etiquetas en mayúsculas solo con `tracking-wide` y a 12 o 13 px.

## Formas

- Botón principal: píldora (`rounded-full`), alto mínimo de 44 px, uno solo por pantalla.
- Fotos de producto: `rounded-xl`. Miniaturas del panel: redondas.
- Pestañas: subrayado de 2 px, sin cajas.
- Casi sin bordes ni sombras. Las tarjetas se separan con aire o con una línea `line`. Sombra solo en lo que flota (barra inferior y hojas).

## Catálogo público

**Una sola plantilla para todos los locales** (decidido el 2026-11-22, `docs/superpowers/specs/2026-11-22-catalogo-nuevo-design.md`). Cada local personaliza portada, logo, nombre, frase y color; el resto es igual.

- Diseñado a 375 px. Grilla de 2 columnas; 3 desde 640 px y 4 desde 1024 px, centrada hasta 1024 px.
- Portada: foto del comercio o, si no tiene, un degradé de su color. Encima: nombre en `font-display` y frase.
- Debajo: estado (abierto o cerrado), dirección con botón **"Cómo llegar"** (píldora con borde, ícono de mapa, abre Google Maps), "Ver horarios", chips de envío / mínimo / medios de pago (fila que se desliza) y el recuadro **"Todos los pedidos incluyen"** (superficie con borde, tildes del color de la marca, hasta 4 frases).
- Buscador redondeado con lupa y, al lado, "Ordenar" (menor o mayor precio). Con búsqueda u orden activos se muestra una sola grilla de resultados; sin resultados, "No encontramos «…»" y "Borrar la búsqueda".
- Categorías: **píldoras** fijas arriba (la activa rellena con la marca, las demás con borde), con desplazamiento horizontal. Cada una lleva a su sección. Primera sección: "Destacados".
- Tarjeta: foto 4:5 (`rounded-xl`; sin foto, bloque de la marca con el nombre en `font-display`), contador "N fotos" si tiene varias, etiquetas (Oferta rellena con la marca, el resto en `surface-muted`), nombre, precio, anterior tachado y **"Ahorrás $ …"** en `accent`, y "Agregar" a lo ancho. "Sin stock": etiqueta roja, foto atenuada, sin botón.
- **Ficha del producto** (`<dialog>`): sube desde abajo en el celular (hasta 92 % del alto, esquinas de arriba redondeadas) y es una ventana centrada de hasta 512 px en pantallas grandes. Fotos con desplazamiento y puntitos, X redonda arriba a la derecha, etiquetas, nombre en `font-display`, precio grande, descripción completa, tabla de características (nombre en `muted`, valor en negrita) y abajo, fijo, el botón principal **"Agregar · $ precio"** relleno con la marca. "Atrás" del celular la cierra.
- **Opciones en la ficha** (parte 3): por grupo, nombre y regla ("Elegí 1", "Opcional · hasta 2"); opciones como píldoras de 44 px (elegida rellena con la marca, el resto con borde, adicional "+$ 1.500" en `muted`, agotadas tachadas y deshabilitadas). El botón principal dice "Agregar · $ precio de la combinación" o "Falta elegir tamaño" deshabilitado. En la tarjeta: "Desde $ …" si alguna opción suma precio, y "Elegir" en lugar de "Agregar".
- Íconos SVG dibujados (`components/storefront/icons.tsx`), nunca emojis.
- Sin datos de la plataforma arriba. La marca es la del comercio.

### Pedido (etapa 7)

- **Agregar:** en la tarjeta, botón de píldora a lo ancho con borde del color del comercio; en la ficha, botón principal relleno con el precio. Cuando el producto ya está en el pedido, pasa a un selector `− cantidad +` relleno con la marca. Botones de 44 px. Los productos sin stock no tienen botón.
- **Barra "Ver pedido · N"**: fija abajo, del color del comercio, con el total a la derecha y un degradé del fondo detrás para que no tape el contenido de golpe. Es la única sombra del catálogo. Se oculta con el pedido vacío o con la hoja abierta.
- **Hoja del pedido** (`<dialog>`): pantalla completa en el celular y ventana centrada de hasta 512 px en pantallas grandes. Contiene líneas con selector, "¿Cómo lo recibís?" (dos opciones grandes: retiro o envío con su costo), datos del cliente, resumen y un único botón principal abajo, "Enviar pedido por WhatsApp".
- Los avisos que bloquean el envío (cerrado, pedido mínimo) van en una línea sobre el botón, en `muted`. Los errores del servidor van en `danger` sobre `danger-soft` con `role="alert"`.
- **Pedido registrado:** número grande en `font-display` y el botón "Enviar por WhatsApp" por si el navegador no abrió WhatsApp solo.

## Panel del comercio: panel fácil (2026-11-23)

- Para dueños poco amigos de la web: botones grandes, palabras de mostrador, lo más usado a un toque.
- Menú: barra fija abajo en el celular (Inicio, Pedidos, Productos, Mi local) con íconos SVG, la sección actual en `accent` dentro de una píldora `accent-soft` y el número de pedidos nuevos en `danger`. Desde 768 px, la misma fila arriba.
- Bloques en `surface` con borde `line` y `rounded-2xl`; títulos de página en `font-display` 28 px; textos de ayuda en `muted` debajo de cada opción.
- Interruptores (`Switch`) en lugar de casillas para estados: "Se ve en tu catálogo", "Hay stock", "Destacado", siempre con una línea que explica qué pasa.
- Botón principal de los formularios: píldora `accent` a lo ancho, fijo abajo ("Guardar cambios"). Acción de crear en listas: botón flotante "+ Producto".

## Piezas comunes del panel (rediseño 11a, 2026-11-26)

Una sola versión de cada una, en `src/ui/`. Las pantallas no arman botones ni etiquetas a mano.

- **Botón** (`button-classes.ts` + `button.tsx`: `buttonClasses(variant, size, extra)`, `<Button>`, `<ButtonLink>`). Siempre píldora. Variantes: `primary` (verde, hacer algo; uno solo por zona), `secondary` (blanco con `line-strong`), `soft` (`surface-muted`), `text` (verde sin fondo), `whatsapp` (solo lo que abre WhatsApp) y `danger` (texto rojo sin fondo: borrar, cancelar). Tamaño `md` de 44 px; `sm` de 36 px solo para acciones de fila en pantallas grandes. Apagado al 50 %; mientras envía dice "Guardando…" (`SubmitButton`).
- **Orden en un pie de formulario:** borrar solo a la izquierda; secundario y principal a la derecha.
- **Lo elegido** (menú, filtro, opción marcada): fondo `accent-soft` con texto `accent`. Nunca negro.
- **Píldora de estado** (`pill.tsx`, `<Pill tone>`): punto + texto, 28 px. Tonos `neutral`, `accent`, `warning`, `info`, `plum`, `danger`. Pedidos (`STATUS_TONE`): nuevo ámbar, confirmado azul, en preparación violeta, listo verde claro, entregado neutro, cancelado rojo.
- **Campos** (`form.tsx`): fondo `field`, borde `line`, radio 14 px, 48 px de alto, foco con borde `accent` y anillo `accent` al 20 %, error (`aria-invalid`) en `danger` sobre `danger-soft`.
- **Aviso breve** (`toast.tsx`, `ToastProvider` en el layout del panel y `useToast().show(mensaje, "ok" | "error")`): píldora `surface` con sombra, abajo al centro y por encima del menú del celular; se va sola a los 3 s. Reemplaza los "Se guardó" en línea.
- **Esqueletos** (`skeleton.tsx`: `Skeleton`, `FormSkeleton`, `ListSkeleton`): la forma de lo que viene; sin animación con `prefers-reduced-motion`. Nunca "Cargando…" suelto.
- **Cabecera de pantalla** (`page-header.tsx`, `<PageHeader eyebrow title description action>`): sobretítulo dorado (`accent-2`) en mayúsculas, título `font-display` 28 px, una línea que dice para qué sirve la pantalla y una sola acción a la derecha. Se aplica en la parte 3 del rediseño.

## Modo oscuro

- Se define en tokens con `prefers-color-scheme`. Cada componente usa tokens, así cambia solo.
- La marca del comercio no cambia en oscuro. Su texto sigue eligiéndose por contraste.

## Panel central: Grafito

Elegido el 17 de noviembre de 2026, al empezar la etapa 9, entre tres direcciones oscuras (Grafito, Tinta y Concreto; maquetas en https://claude.ai/artifact/R9qH1AffHxseSqvFRG55tD).

**Intención:** Sobremesa en oscuro, para trabajar por excepciones. Grises con un tinte verde, el verde yerba como acento y el mismo par tipográfico, así el panel central se siente parte de la misma familia. Más denso que el panel del comercio: tablas, números alineados y filtros rápidos.

- **Siempre oscuro** (no sigue el tema del sistema). Se activa con `data-surface="admin"` en el layout de `/admin`, que pisa los mismos tokens (`bg-background`, `text-muted`, `bg-accent`…). Los componentes no cambian de clases.
- Números (montos, contadores, slugs): `font-mono` (IBM Plex Mono) con `tabular-nums`.

| Token | Valor | Rol |
| --- | --- | --- |
| `background` | `#0F1112` | Fondo |
| `surface` | `#16191B` | Menú lateral, encabezados de tabla, tarjetas de números |
| `surface-muted` | `#1D2124` | Fila al pasar el mouse, ítem activo, chips activos |
| `line` | `#2A2F33` | Bordes y separadores |
| `foreground` | `#E7EAE8` | Texto |
| `muted` | `#9AA39D` | Texto secundario (AA sobre `background` y `surface`) |
| `accent` / `accent-foreground` | `#8FBF98` / `#0F1A12` | Acción principal, foco, chip activo |
| `warning` | `#E5B86B` | Prueba por vencer, pago pendiente |
| `danger` / `danger-soft` | `#EC8A78` / `#3A2420` | Vencido, suspendido, borrar |

- **Estados del comercio:** píldora con punto y texto. Activo en `accent`, Prueba neutra, Pago pendiente en `warning` y Suspendido o Cancelado en `danger`. Nunca solo color.
- **Movimiento:** el botón sube 1 px y se aclara al pasar el mouse (`translateY(-1px)`, `brightness(1.08)`), y al apretarlo se achica a `scale(.98)`, en unos 120 ms. Las filas cambian de fondo en 150 ms. Sin movimiento con `prefers-reduced-motion`.
- **Estructura:** menú lateral fijo en pantallas grandes y arriba en el celular. Arriba de cada lista, los números que importan; debajo, filtros rápidos por excepción ("Prueba por vencer", "Sin pedidos en 14 días"). Las tablas pasan a lista en el celular.
- Una sola acción principal por pantalla (por ejemplo, "Alta asistida" o "Registrar pago").

## Pendiente

- Llevar el panel a estos tokens (encabezado, listados como en la maqueta, estados vacíos). Va en un cambio aparte, no en la etapa 6.

## Página principal: Noche

Elegida el 20 de noviembre de 2026 con una muestra (diseño en `docs/superpowers/specs/2026-11-20-pagina-principal-design.md`). `data-surface="marketing"` en `src/app/(marketing)/layout.tsx`: la usan la página principal, `/registro` y los legales.

**Intención:** lo primero que ve un comerciante que todavía no es cliente. Negro con tinte violeta, siempre oscuro (no sigue el modo del sistema), con el mismo par tipográfico que la app para que no haya un salto al registrarse.

| Token | Valor | Rol |
| --- | --- | --- |
| background | `#0B0912` | Fondo casi negro con tinte violeta |
| surface | `#15111F` | Tarjetas y bloques |
| surface-muted | `#1D1830` | Lo que flota (burbuja de pedido, menú móvil) |
| line | `#2B2442` | Bordes y separadores |
| foreground | `#F3F0FA` | Texto principal |
| muted | `#A8A2BD` | Texto secundario (AA sobre fondo y superficie) |
| accent | `#7C3AED` | Botón principal, con texto blanco |
| accent-soft | `#C4B5FD` | Énfasis en títulos, links, etiquetas y el foco |

- Un resplandor violeta suave solo detrás del hero y del cierre.
- Las maquetas del producto van en los colores del comercio ficticio (variables `--mock-*`, naranja de Gastronomía), no en violeta: el catálogo de cada comercio lleva su marca.
- Animaciones: `.mk-rise` y `.mk-rise-late` (aparecer subiendo 12 px). Se apagan con `prefers-reduced-motion`.
