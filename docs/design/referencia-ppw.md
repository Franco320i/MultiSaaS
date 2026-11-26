# Referencia de diseño: PPW (catálogo "Patagonia Market" y panel de demo)

Secciones 1 a 5: catálogo público. Sección 6: panel del comercio.

Notas tomadas el 2026-11-26 recorriendo `ppw.com.ar/p/patagonia-market`, la demo de PPW: otra plataforma argentina de catálogos con pedidos a WhatsApp. Al usuario le gustó mucho el catálogo.

**Para qué sirve.** Igual que `referencia-myshp.md`: aprender **patrones** (estructura, jerarquía, medidas, comportamiento) y aplicarlos al catálogo de Vidri con el color de cada comercio. No se copian logo, textos, fotos ni código. Si una idea entra, primero se actualiza `sistema-visual.md`.

**En una frase:** se lee como **la carta de un restaurante bueno**. Productos en filas con texto a la izquierda y foto a la derecha, secciones por categoría con título y bajada, fondo crema y un verde oscuro con un cobre de segundo color. Es la misma intención que "Sobremesa", llevada más lejos.

---

## 1. Sistema de colores y medidas

Todo el catálogo se pinta con **10 colores** y unas 60 medidas con nombre (`--ppw-*`). Cada comercio cambia los colores; las medidas cambian con la disposición elegida.

```text
--brand        #243A2D   verde oscuro: categoría activa, precio, botones
--brand-2      #B5713E   cobre: segundo color (degradé de la portada sin foto, detalles)
--page-bg      #F5F0E7   fondo crema
--text         #243129   texto (verde casi negro)
--muted        #716B60   secundario (cálido)
--card         #FFFFFF   tarjetas
--button       #243A2D   botón "Agregar" y "Enviar pedido"
--button-text  #FFFFFF
--header-text  #FFF8EA   texto sobre la portada (crema, no blanco puro)
--header-text-soft #E7DCC8
--radius       18px
```

- **Dos colores de marca, no uno.** El segundo (cobre) da calidez y se usa en la portada sin foto (degradé de `brand` a `brand-2`) y en detalles. Vidri hoy tiene uno solo (`theme.brand`).
- **El precio va en el color de la marca** (`--ppw-price-color: var(--brand)`), en 18 px. En Vidri el precio va en `foreground`: decisión a revisar.
- **Fondo de la foto teñido:** `color-mix(in srgb, var(--brand) 10%, #f3f3ef)`. Mientras carga la foto, el hueco ya tiene el tono del comercio.
- **Sombras teñidas y suaves:** la categoría activa tiene una sombra del color de la marca al 24 % (`0 8px 18px`), y el buscador una casi invisible (`0 14px 38px` al 8 %).
- **Tipografía única: Outfit**, con interletrado negativo en los títulos:
  - nombre del comercio: `clamp(2rem, 4.3vw, 2.75rem)`, interlineado 1.05, −3.5 %;
  - título de categoría: 30 px, peso 700, −2.5 %;
  - nombre de producto: 17.6 px, peso 700;
  - descripción: 14 px, interlineado 1.45, en `muted`.

## 2. Estructura de la página (de arriba abajo)

### Portada

- Foto a todo el ancho (unos 250 px en escritorio, 150 px en el celular) con un **velo oscuro en diagonal** encima, para que el texto se lea siempre. Sin foto: degradé de `brand` a `brand-2`.
- Logo en una caja clara centrada. Debajo:
  - "PEDIDOS POR WHATSAPP" (mayúsculas chicas, como sobretítulo);
  - la frase del comercio;
  - una línea de datos con íconos: ciudad, Instagram, WhatsApp y **Compartir**.
- **Variantes de encabezado** (clases que trae la página): foto a todo el ancho, logo superpuesto (el logo de 82 px "pisa" el borde inferior de la portada, con borde de 4 px, como un perfil), centrado y solo logo.

### Tarjeta de estado (lo que más se destaca)

Una **barra blanca flotante** (blanco al 94 %, radio 20, sombra suave) que se superpone apenas a la portada, con 4 datos en columnas, cada uno con un ícono en un cuadradito, una etiqueta chica y el valor en negrita:

1. **Estado** · "Tomando pedidos" (tilde verde);
2. **Pedido mínimo** · "$ 15.000";
3. **Horarios** · "Lunes a sábado de 10:00 a 20:00" con una flecha que **despliega la tabla por día** en una tarjeta debajo ("DISPONIBILIDAD · Horarios del comercio", con una X para cerrar);
4. **Catálogo** · "Ver productos ↓", que baja hasta la lista.

En el celular se achica (radio 17) y pasa a desplazarse de costado.

**Para Vidri:** hoy mostramos lo mismo (abierto o cerrado, envío, mínimo, horarios) como chips sueltos y un "Ver horarios". Juntarlo en **una sola tarjeta de estado** se ve más ordenado y más "de comercio serio". El "abierto ahora" ya se calcula en el navegador (`OpenStatus`).

### Buscador y categorías (fijos al bajar)

- El buscador (58 px de alto, radio 18, borde casi invisible, sombra suave) y la fila de categorías **quedan pegados arriba al bajar** (`.catalog-tools`, `position: sticky`). Siempre se puede buscar o saltar de categoría.
- **Categorías como píldoras de 40–42 px:** inactivas sin fondo y en `muted`, peso 650; la activa rellena con la marca, texto blanco y sombra teñida.
  - En escritorio: flechas ‹ › a los costados.
  - En el celular: sin flechas, deslizable con imán (`scroll-snap`).
- Al tocar una categoría, la página **baja hasta esa sección**, no filtra. Deja un margen arriba (`scroll-padding-top: 136–150px`) para que la barra fija no tape el título.
- La categoría activa **cambia sola** al bajar.
- **Vidri ya hace casi todo esto** (`CategoryPills` en `catalog-browser.tsx`: píldoras fijas arriba, salto a la sección y activa con `IntersectionObserver`). Lo que falta es que **el buscador también quede fijo** junto a las píldoras.

### Franja de servicio

Una banda de 57 px, radio 16, en un azul oscuro propio, con "Entrega refrigerada · Retiro coordinado · Pedidos por WhatsApp". Hace lo mismo que nuestro recuadro "Todos los pedidos incluyen", pero en una línea.

### Secciones por categoría

- **Título grande** (30 px) + **bajada** de una línea ("Cortes seleccionados para una parrilla memorable") + una **rayita corta debajo** del color de la marca.
- **Vidri ya lo tiene casi igual:** secciones con título en `font-display` (22 px) y la descripción de la categoría (`catalog_categories.description`) debajo. Lo que cambia es la escala (30 px) y la rayita de la marca.

### Tarjeta de producto: fila de carta

- **Horizontal:** a la izquierda nombre, insignias, descripción de 2 líneas y abajo el precio y "+ Agregar"; a la derecha la **foto de 118 × 132 px** (104 en el celular, 92 en pantallas muy chicas), con esquinas 6 px más chicas que la tarjeta.
- Tarjeta blanca, radio 18, borde casi invisible (`rgba(28,33,45,.075)`), padding 17, alto mínimo 166.
- 2 columnas en escritorio y 1 en el celular, separadas 11–15 px.
- **Insignias:**
  - "☆ Destacado": píldora amarilla clara (`#fff2bd`) con texto ocre (`#9a6500`), 10 px, peso 750, al lado del nombre;
  - "OFERTA": cartelito sobre la esquina de la foto.
- **Precio con oferta:** el anterior tachado y chico **arriba**, el actual grande abajo.
- **"+ Agregar"** relleno, radio 13, abajo a la derecha del texto. En pantallas de menos de 390 px queda **solo el "+"**.
- Tocar la foto abre una **ampliación** (foto grande, nombre, descripción y precio), sin botón de agregar.

**Para Vidri:** nuestra grilla de fotos 4:5 sirve para ropa y objetos. Para gastronomía, almacén o fiambrería (donde importa leer la descripción), **la fila de carta es mejor**. Encaja como segunda opción de tarjeta (ver "Menú de pedido rápido" de MyShp, sección 6b de su referencia): "Grilla" o "Carta", elegida por rubro.

### Agregar y carrito

- Al tocar "Agregar":
  - aviso breve **"Producto agregado"** (píldora oscura centrada, sobre la barra);
  - aparece una **barra flotante oscura** abajo al centro (`#151924`, radio 20, sombra fuerte) con ícono de bolsa, "1 producto · Tu pedido", "Total $ 25.080" y "Ver pedido ›". En pantallas chicas, "Ver pedido" queda solo como flecha.
- **El botón no se convierte en `− 1 +`**: la cantidad se cambia en el carrito. Vidri sí lo hace en la tarjeta, y está mejor.
- **Carrito:**
  - en escritorio, **panel lateral** de 430 px con el resto desenfocado;
  - en el celular, **hoja desde abajo** (hasta 84 % del alto, radio 26 arriba, **manija** de 44 × 5 px, respeta la barra del iPhone).
  - Contiene "Tu compra / Detalle del pedido", líneas con `− 1 +` y tacho rojo, el total, Nombre, WhatsApp (opcional), "¿Cómo recibís el pedido?" (Retiro en el local / Envío a domicilio, con Dirección solo si es envío), **Observaciones** ("Ej.: sin cebolla, tocar timbre…") y "Enviar pedido por WhatsApp" (50 px, radio 15, peso 750, ícono de WhatsApp).
  - Todo en un solo paso, como el nuestro.

### Pie

Mínimo: "Esta lista es provista por ppw.com.ar · ¿Querés la tuya?". Es publicidad de la plataforma en cada catálogo.

## 3. Disposiciones que trae (por las clases de la página)

Sin verlas todas, la página trae: `layout-grid`, `layout-tienda`, `layout-fast-food`, `layout-compacto`, `layout-editorial`, `layout-minimal` y `layout-accordion` (categorías plegables, cada una de 60 px de alto). También tiene `catalog-without-images`, una versión para comercios **sin fotos** (tarjetas más bajas, solo texto), y cuatro encabezados.

**Para Vidri:** "Catálogo sin fotos" es muy útil para un kiosco, una rotisería o una verdulería que no tiene fotos de todo. Hoy, sin foto, mostramos un bloque con el nombre: con muchos productos sin foto conviene la fila de texto.

## 4. Lo que no está tan bien (no copiar)

1. La ampliación de la foto **no tiene "Agregar"**: el cliente tiene que cerrarla y buscar el botón.
2. Los horarios resumidos no coinciden con la tabla ("10:00 a 20:00" arriba, "de 10 a 23 hs." el miércoles). En Vidri el resumen sale de los mismos datos.
3. Los botones de cantidad del carrito miden 30–32 px (lo cómodo es 44).
4. Escape no cierra el carrito en escritorio (hay que tocar la X).
5. Aparece una bienvenida a pantalla completa antes de ver el catálogo. Solo es de la demo, pero un cartel así en un catálogo real espanta.

## 5. Ideas para llevar al catálogo de Vidri

| Idea | Tamaño | Notas |
| --- | --- | --- |
| **Tarjeta de estado** (estado, mínimo, horarios desplegables, ver productos) en lugar de chips sueltos | Chico | Mismos datos que hoy |
| **Buscador fijo** junto a las píldoras de categorías | Chico | Las píldoras ya son fijas y siguen la sección |
| Secciones con título más grande y rayita de la marca | Chico | Título y descripción ya existen |
| **Tarjeta "Carta"** (fila con foto a la derecha) como opción junto a la grilla, por defecto en gastronomía y almacén | Medio | Se cruza con el editor de diseño (referencia de MyShp, sección 5) |
| **Segundo color de marca** (`brand-2`) para la portada sin foto y detalles | Chico | `theme` es jsonb: solo validar con Zod |
| Velo diagonal sobre la foto de portada y texto crema | Chico | |
| Fondo de foto teñido de la marca mientras carga | Chico | |
| Logo superpuesto al borde de la portada (tipo perfil) | Chico | Una variante de encabezado |
| Barra de pedido flotante con total + aviso "Producto agregado" | Chico | Hoy tenemos la barra "Ver pedido"; sumar el aviso |
| Carrito: panel lateral en escritorio, hoja con manija en el celular | Chico | |
| Ejemplo concreto en el campo de observaciones ("Ej.: sin cebolla, tocar timbre…") | Chico | El campo ya existe (`orders.notes`); solo el texto de ejemplo |
| Precio en el color de la marca | Chico | Revisar contraste AA con cada color |
| Versión "sin fotos" del catálogo | Medio | Detectarla sola si la mayoría no tiene foto, o elegirla |

Lo que ya tenemos igual que PPW: secciones por categoría con descripción, píldoras fijas que siguen la sección, retiro o envío y observaciones en el pedido. Lo que tenemos y PPW no: `− cantidad +` en la tarjeta, ficha con opciones (tamaño, extras), "Abierto ahora" calculado y "Cómo llegar".

**Orden sugerido:** juntarlo con el paso 2 del orden de MyShp (catálogo): tarjeta de estado, buscador fijo, tarjeta "Carta" y segundo color. Cada parte con su diseño corto en `docs/superpowers/specs/` y el OK del usuario.

---

## 6. Panel del comercio (demo `ppw.com.ar/demo-panel/`)

Recorrido el 2026-11-26. Al usuario le pareció **muy limpio**. La demo solo muestra: crear, editar y guardar están apagados (sale un aviso "Modo demostración" abajo a la derecha), así que se vieron las pantallas, no las ventanas de edición.

**Por qué se ve limpio:** pocos elementos por pantalla, un solo verde, casi todo blanco sobre un gris verdoso muy claro, sin negro, sin tarjetas de resumen de más y sin botones repetidos. Es lo contrario de MyShp, que es potente pero cargado.

### Colores (9 en total)

```text
--primary       #1f513d   verde bosque: botón principal, ítem activo, links
--primary-dark  #163d2e
--accent        #c99b57   dorado: solo el sobretítulo de cada pantalla
--bg            #f5f6f4   fondo gris verdoso, no crema
--card          #fff
--text          #17231d
--muted         #6f7c75
--line          #e5e9e6
--shadow        0 14px 40px rgba(28,54,42,.08)   (las tarjetas usan una más suave: 0 8px 25px al 3.5 %)
```

**Es casi la misma paleta que Sobremesa** (verde yerba, neutros que tiran a verde). Lo que suma es el **dorado como segundo color**, usado en un solo lugar, y que **nada es negro**.

Tipografía: Outfit en todo. Título de pantalla 30 px, peso 700; título de la barra 22 px; bajada 16 px en `muted`.

### Esqueleto

- **Franja de demo** arriba, en el verde. No aplica a Vidri.
- **Menú lateral blanco** de unos 210 px:
  - logo y, debajo, una **tarjeta del comercio** (cuadrado del color del comercio, "EMPRESA DEMO", nombre en negrita) sobre un crema suave;
  - 6 secciones: **Dashboard, Productos, Categorías, Pedidos, Diseño, Estadísticas**;
  - ítems de 43 px, radio 11, 14 px. **El activo va en verde muy claro (`#eaf2ee`) con texto verde y peso 700**, no en negro;
  - abajo, separado por una línea: "Ver catálogo" y "Solicitar demo".
- **Barra superior blanca:** "Panel de gestión" chiquito encima del nombre de la pantalla (22 px), y a la derecha "👁 Ver catálogo" (link verde) y el avatar con iniciales.
- Cada sección tiene su dirección (`?seccion=productos`).
- **En el celular** el menú lateral se esconde y se abre con un botón de menú (hamburguesa), y todo pasa a una columna. **Vidri está mejor acá:** el menú fijo abajo del "Panel fácil" es más cómodo con el pulgar.

### La cabecera de cada pantalla (el patrón que más ordena)

Todas las pantallas empiezan igual:

1. **Sobretítulo dorado** en mayúsculas chicas, que dice de qué grupo es: "CATÁLOGO", "ORGANIZACIÓN", "VENTAS", "RENDIMIENTO", "CONFIGURACIÓN CENTRAL".
2. **Título** de 30 px ("Productos").
3. **Bajada de una línea que dice para qué sirve la pantalla**, en tono de mostrador ("Actualizá precios, imágenes, stock y destacados desde un único lugar", "Consultá cada pedido recibido y su estado antes de continuar la conversación por WhatsApp").
4. **Una sola acción a la derecha**: "+ Nuevo producto", "+ Nueva categoría", "Exportar", "Guardar cambios" o el selector "Últimos 30 días".

Debajo, una sola tarjeta blanca grande con el contenido.

### Botones y etiquetas (medidos)

| Rol | Ejemplo | Fondo | Texto | Alto | Esquinas | Letra |
| --- | --- | --- | --- | --- | --- | --- |
| Principal | "+ Nuevo producto", "Guardar cambios" | verde `#1f513d` | blanco | 38–40 | **10** | 13 / 600 |
| Secundario | "Filtrar", "Exportar", "Este mes" | blanco | verde | 40 | 10 | 13 / 600, borde `line` |
| Sobre fondo verde | "Ver productos" (blanco con texto verde) y "Revisar pedidos" (blanco al 10 % con borde al 30 %) | | | 40 | 10 | 13 / 600 |
| Ícono | lápiz y ⋮ de cada fila | blanco | `muted` | 34 × 34 | 9 | borde `line` |
| Link | "Ver todos", "Administrar", "Ver catálogo" | — | verde | — | — | 12–14 / 600 |
| Selector | "Todas las categorías" | blanco | texto | 40 | 9 | borde `line` |
| Campo | formularios de Diseño | casi blanco `#fafbfa` | texto | 37 | 9 | borde `line` |

**Estados como píldoras chicas** (23 px, 10 px, peso 700, sin borde), cada uno con fondo claro y texto oscuro del mismo tono:

- Nuevo: `#fff0d9` / `#9d6519` (ámbar);
- Confirmado: `#e6f0ff` / `#3565a7` (azul);
- Preparando: `#f1eaff` / `#714e9b` (violeta);
- Entregado y Activo: `#e8f4ed` / `#337153` (verde);
- Destacado y Visible: también verde claro.

### Pantallas

- **Dashboard:**
  - **bloque de bienvenida verde** a lo ancho (radio grande, un círculo decorativo apenas visible) con sobretítulo dorado "BIENVENIDO A PPW", título "Tu catálogo, pedidos y ventas en un solo lugar.", una línea de texto y dos botones ("Ver productos", "Revisar pedidos"). A la derecha, una **tarjeta translúcida "Catálogo público"** con la dirección y "Abrir catálogo";
  - **4 números** en tarjetas: ícono en un cuadrado verde muy claro, etiqueta chica, número grande y una línea de detalle ("+4 este mes", "+18 % vs. mes anterior", "Pedidos por WhatsApp");
  - **"Últimos pedidos"** (tabla: número con fecha debajo, cliente, estado y total) con "Ver todos", y **"Más pedidos"** (ranking 1-4 con foto redonda, nombre, categoría y "31 pedidos") con "Administrar".
- **Productos:** buscador ancho, selector de categoría y "Filtrar". Lista en filas de 44 px de alto útil: foto cuadrada redondeada de 30 px, nombre en negrita, categoría y "Código interno" en gris; a la derecha el precio en negrita, la píldora de estado, el lápiz y ⋮ (más opciones).
- **Categorías:** grilla de 2 columnas de tarjetas, cada una con **un ícono del rubro** en un cuadrado verde claro (fuego para carnes, queso, botella, parrilla…), nombre, "12 productos", la píldora "Visible" y el lápiz.
- **Pedidos:** "Exportar" arriba; buscador "Buscar cliente o pedido", selector de estados y "Este mes"; tabla Pedido / Cliente / Fecha ("Hoy, 11:42", "Ayer, 19:56") / Estado / Total / "Ver detalle".
- **Diseño ("Datos y funcionamiento del comercio"):** dos columnas, con los formularios a la izquierda y, a la derecha, una **tarjeta fija "URL y código QR"** (dirección con botón de copiar, "Abrir catálogo", el QR, "Descargar PNG" y "Generar PDF"). Los bloques del formulario tienen sobretítulo y título:
  - INFORMACIÓN · Datos del comercio (nombre, dirección `/p/` con prefijo fijo y ayuda "Solo minúsculas, números y guiones", WhatsApp con ayuda de formato, Instagram con `@` fijo);
  - IDENTIDAD · Logo (nombre del archivo, "PNG, JPG o WebP. Máximo 3 MB", "Cambiar logo");
  - CONTENIDO · Textos del catálogo (texto de arriba y texto de abajo);
  - DISPONIBILIDAD · Horarios y estado ("Mostrar horarios", un horario por día o texto libre, "Catálogo abierto");
  - FUNCIONAMIENTO · Condiciones del pedido (pedir forma de pago, pedido mínimo, moneda y formato).
  - "Guardar cambios" arriba a la derecha, uno solo para toda la pantalla.
- **Estadísticas:** selector "Últimos 30 días"; 4 números (visitas, carritos iniciados, pedidos enviados, ticket promedio, cada uno con su porcentaje); barras verdes con degradé por mes y "Categorías más vistas" con barras horizontales finas y porcentaje. Las estadísticas de visitas no están en nuestro diseño.

### Para Vidri

| Idea | Tamaño | Notas |
| --- | --- | --- |
| **Cabecera de pantalla fija:** sobretítulo + título + bajada que dice para qué sirve + una sola acción a la derecha | Chico | Lo que más "ordena". Encaja con la regla "una acción principal por pantalla" |
| **Ítem activo en verde claro con texto verde**, en vez de negro (MyShp) | Chico | Responde la duda abierta de la sección 11 de `referencia-myshp.md`: es más suave y usa `accent` |
| Segundo color (dorado o cobre) solo para sobretítulos y detalles | Chico | Token nuevo `accent-2`; se cruza con el segundo color del catálogo |
| Estados como píldoras sin borde: ámbar, azul, violeta, verde | Chico | Completa la tabla de estados de la sección 11 de MyShp (`preparing` en violeta) |
| Inicio con bloque de bienvenida, tarjeta del link y 4 números con detalle | Medio | Nuestros datos: pedidos del mes, ventas estimadas (`tenant_order_stats`), productos, categorías |
| "Más pedidos": ranking de productos con foto | Chico | Sale de `order_items`; pasar por el diseño si pide una función nueva |
| Categorías en tarjetas con ícono del rubro y cantidad de productos | Chico | |
| Lista de productos en filas finas: foto, nombre, categoría, precio, estado, lápiz y ⋮ | Chico | En el celular, con el interruptor de stock que ya tenemos |
| Ajustes en dos columnas con la tarjeta fija de "link + QR" a la derecha | Medio | Ya tenemos QR (`src/lib/qr.ts`); sumar "Descargar" |
| Bloques del formulario con sobretítulo + título y ayudas debajo de cada campo | Chico | |
| Botones con esquinas de 10 px | — | **No:** Sobremesa usa píldora. Tomar el resto |

**Qué no tomar:** la hamburguesa en el celular (nuestro menú de abajo es mejor), los 6 ítems del menú (Vidri tiene 4 y ya es suficiente; categorías puede vivir dentro de Productos, como en MyShp) y las estadísticas de visitas, que no están en el diseño.

**PPW o MyShp en el panel:** MyShp aporta **los recorridos** (ventanas sobre la lista, cambiar el estado en la fila, avisos al cliente) y PPW aporta **la calma visual** (pocos elementos, verde claro para lo elegido, una cabecera igual en todas las pantallas). Las dos cosas combinan: estructura de PPW con los flujos de MyShp.
