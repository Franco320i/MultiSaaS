# Referencia de diseño: MyShp (myshp.link)

Notas tomadas el 2026-11-25 recorriendo MyShp, un producto parecido a Vidri (catálogo en un link y pedidos a WhatsApp), que al usuario le gustó por su diseño y por cómo maneja la interfaz.

**Para qué sirve este archivo.** Aprender sus **patrones**: estructura, jerarquía, medidas, comportamiento y sistema de temas. Después se aplican a Vidri con **nuestros colores y nuestra marca**.

**Qué no se copia:** logo, nombre, textos, ilustraciones, fotos ni código. Tampoco una pantalla idéntica. La meta es "algo de la misma calidad, que se reconozca como Vidri".

Cada patrón se adapta con la skill `/diseno-interfaz` y respetando `docs/design/sistema-visual.md`. Este archivo es la referencia, no la fuente de verdad del diseño: si una idea entra, primero se actualiza `sistema-visual.md`.

Estado del recorrido:

- [x] Página principal (pública)
- [x] Catálogo público: dos comercios, dos plantillas
- [x] Carrito y ficha de producto
- [x] Registro y alta del comercio: asistente de 3 pasos
- [x] Panel del dueño: Inicio, Productos, formulario y variantes, Historia, editor de Plantillas (9 pasos), Pedidos y Ajustes
- [x] Recorrido de compra en escritorio
- [x] Segundo recorrido (sección 6b): página principal entera, panel en pantalla chica, diseños en la vista previa, ficha con variantes, compra completa con recibo, pedido de prueba en el panel, Ajustes por dentro, Categorías y avisos
- [x] Tercer recorrido (2026-11-26, Chrome): recorridos entre pantallas (sección 9), botones del panel medidos (sección 10) y traducción a los colores de Vidri (sección 11)
- [ ] Panel central: no se puede ver, es interno de ellos. Se infiere del panel del dueño (sección 6).

Comercio de prueba creado en MyShp: `myshp.link/prueba-vidri-cafe`, con un producto con 3 tamaños, la categoría "Cafeteria" y el pedido de prueba ORD-1746-001 (confirmado). Es de la cuenta del usuario y se puede borrar desde Ajustes → Zona de peligro.

---

## 1. Sistema base (tokens)

Sale de las variables CSS de `:root` en la página principal. **Es lo más valioso para copiar como método.**

### Escalas de color

- **Una marca con 10 tonos** (`--brand-50` … `--brand-900`). Su verde principal es `--brand-600 #0f7a55`.
- **Un gris "tinta" cálido de 11 tonos** (`--ink-50 #f7f6f3` … `--ink-900 #14120e`). No es un gris neutro: tira a beige. Por eso todo se ve "papel" y no "plantilla".
- **Fondo de página `ink-50` (#f7f6f3), no blanco.** Las superficies (tarjetas, campos) sí van en blanco. El blanco resalta sobre el crema.
- **Texto principal `#14120e`** (casi negro, cálido). Texto secundario `#6a6a7a`.
- **Estados:** `--success` (igual a la marca), `--danger #b42318`, `--warning #9a5b12`. Son tonos oscuros, legibles sobre fondo claro.
- **Controles:** `--control-bg #f4f2ec` (campos sobre un crema apenas más oscuro), `--control-border` = `ink-200`.
- **Foco:** `--focus-ring: 0 0 0 3px` con la marca al 18 % de opacidad.

### Sombras y radios

- **Casi sin sombras.** `--shadow-xs/sm/md/lg: none`. La separación se hace con borde fino y contraste de fondo.
- **Una sola sombra "lift"** para lo que flota: `0 1px 2px #14120e0f, 0 12px 32px -12px #14120e2e`.
- **Radios:** sm 8, md 12, lg 14, xl 18. Las tarjetas grandes usan `rounded-3xl` (24 px).
- **Botones siempre en píldora** (`border-radius: 999px`).

### Tipografía

- **Dos familias.** UI en **Inter**. Títulos en **Plus Jakarta Sans**, peso 800, con interletrado negativo fuerte.
- **Medidas tomadas:**
  - h1 de la página principal: 73.6 px, peso 800, interletrado −3.3 px (−4.5 %), interlineado 1.02.
  - h2: 52 px, peso 800, interletrado −2.08 px (−4 %), interlineado 1.06.
  - Párrafo destacado: 20 px, interlineado 32 px, color secundario.
  - Cuerpo: 15 px, interlineado 1.55.
- En los catálogos todo es Inter (12–15 px). La ficha usa h1 de 30 px, peso 700, y el precio en 26 px, peso 600.

### Botones (página principal)

| Tipo | Fondo | Texto | Alto | Padding | Fuente |
| --- | --- | --- | --- | --- | --- |
| Primario | `#16191e` (casi negro) | blanco | 40 | 0 16 | 14 / 600 |
| Secundario | blanco | `#242930` | 40 | 0 16 | 14 / 600 |
| Grande (formulario principal) | `#1d1d28` | blanco | 50 | 0 22 | 15 / 700 |

**En la página principal el primario es negro, no de color.** El verde de la marca aparece en detalles: palabras resaltadas del título, insignias, tildes y el globito de WhatsApp. Por eso el color "vale más".

**Ojo: dentro del panel es distinto** (medido el 2026-11-26). Ahí el botón principal es **verde** (`#0f7a55`) y lo negro queda para lo "seleccionado": el ítem activo del menú, el filtro activo y el segmento activo. Ver la sección 10.

### Celular

- `--tabbar-h: 62px`.
- `--tabbar-gap: max(12px, env(safe-area-inset-bottom))`: el menú inferior respeta la barra del iPhone.
- `--tabbar-clearance`: el contenido deja ese espacio abajo para que el menú fijo no tape nada.

---

## 2. Página principal (myshp.link)

Orden de las secciones:

1. **Encabezado:** logo, enlaces (Funciones, Catálogo WhatsApp, Rubros, Ejemplos, Guías, Preguntas), idioma, "Ingresar" (píldora blanca) y "Empezar a vender" (píldora negra).
   - Debajo, una píldora oscura flotante que ofrece la página en tu idioma ("Leer esta página en español →" / "No, gracias"), según el navegador.
2. **Portada:**
   - insignia chica ("100 % gratis · 0 % comisión");
   - título enorme en dos líneas, con la última frase en el color de la marca;
   - bajada en gris;
   - **un campo con el prefijo `myshp.link/` y el botón "Reclamá tu link" adentro**: el registro arranca eligiendo el nombre;
   - tres tildes ("Sin tarjeta", "Productos ilimitados", "Listo en minutos").
   - A la derecha, un collage de tarjetas inclinadas con avisos flotantes ("Pedido nuevo #1042 · 3 artículos · por WhatsApp", "Pagado por adelantado").
3. **Cinta de rubros** que se desplaza (boutiques, joyería, panaderías, almacenes…), con un ícono por rubro.
4. **"Comercios reales que venden hoy":** tarjetas de comercios reales que llevan a sus catálogos. Es prueba social.
5. **"De las fotos al primer pedido en tres pasos":** 1, 2, 3 numerados.
6. **"Todo lo que tu comercio necesita, incluido":** grilla de funciones.
7. **Preguntas frecuentes** en acordeón.
8. **Cierre** con el mismo campo de link, más "Ver comercios reales".
9. **Pie** con enlaces, legales y una página por idioma (`/p/es`, `/p/pt`…).

Además hay **páginas por rubro** (`/p/industries/bakeries-cloud-kitchens`, etc.), útiles para Google, y un **globito de WhatsApp fijo** abajo a la derecha.

**Para Vidri:**

- El campo "`vidri.ar/` + tu nombre" como punto de entrada al registro.
- La sección de comercios reales cuando haya clientes.
- Las páginas por rubro (gastronomía, ropa, kioscos…).

Nuestra página ya tiene el estilo "Noche" (oscuro). Decidir si se mantiene oscura y solo se toma la estructura.

---

## 3. Catálogo público

### Temas configurables

Cada catálogo tiene tres atributos en la raíz:

- **`data-theme`:** paleta, por ejemplo `ocean`. Un comercio rosa tenía otra.
- **`data-template`:** disposición de la página, por ejemplo `hero-banner` o la de perfil tipo Instagram.
- **`data-card-style`:** tarjeta de producto, `classic` (foto + nombre + precio + botón debajo) u `overlay` (nombre y precio sobre la foto con degradé negro).

Más un color de acento propio del comercio (uno tenía `#ff0000`).

**Todo el catálogo se pinta con 9 variables:**

```text
--sfx-bg          fondo de página       (ocean: #f0f7fa)
--sfx-surface     tarjetas              (#ffffff)
--sfx-text        texto                 (#0f2a3a)
--sfx-muted       texto secundario      (#5b7a8c)
--sfx-border      bordes                (#d3e6ee)
--sfx-accent      botones y acentos     (color del comercio)
--sfx-accent-text texto sobre el acento (#ffffff)
--sfx-chip-bg     chips / fondo de foto (#ffffff)
--sfx-card-shadow sombra de tarjeta     (0 1px 2px rgb(14 116 144 / .12), teñida)
```

**Clave:** el fondo, el texto, lo secundario, los bordes y hasta la sombra van **teñidos del tono del tema**:

- comercio rosa: fondo `#fdf3f4`, texto `#3d1524` (bordó oscuro), secundario `#a06b7d`, borde `#f3d4da`;
- tema ocean: todo azulado.

Nada es gris puro, y por eso cada catálogo se siente "de su marca".

**Para Vidri:** hoy tenemos `theme.brand` con contraste AA. Se puede **derivar la paleta completa** (fondo, texto, secundario y borde teñidos) desde el color del comercio, y ofrecer unos pocos temas y dos estilos de tarjeta. Encaja con "plantilla única" (decisión del 2026-11-22): es una sola plantilla con variantes de color y de tarjeta, no plantillas distintas.

### Plantilla "perfil" (tipo Instagram)

Visto en un comercio de joyería.

- **Tarjeta de perfil** (blanca, borde teñido, `rounded-3xl`, padding 16):
  - avatar de 64 px con anillo de 2 px del color del comercio;
  - nombre, y debajo "44 publicaciones · 5 colecciones";
  - un estado ("pedidos en pausa");
  - descripción de 2 líneas (12 px, color secundario);
  - botón "Comprar" de ancho completo en el acento.
- **Barra de anuncio** de 45 px, blanca: ícono redondo de 20 px en el acento y un texto en negrita truncado (por ejemplo, "-20 % con NOEL12"). Sirve para promos.
- **Colecciones como "historias":** fila desplazable de círculos con la foto de cada categoría y su nombre debajo. El primero es "Todo".
- **Aviso de comercio cerrado:** tarjeta blanca con título, etiqueta "PEDIDOS SUSPENDIDOS" y el mensaje del dueño.
- **Encabezado de la grilla:** "Últimas publicaciones" a la izquierda; "Buscar" y "44 artículos" a la derecha.
- **Grilla de 3 columnas cuadradas, sin separación**, como el muro de Instagram.
  - Tarjeta `overlay`: degradé negro abajo, nombre en 11.5 px blanco y precio en 13 px, peso 700.
  - Botón "+" redondo de 28 px abajo a la derecha.
  - Etiquetas "AGOTADO" sobre la foto.
  - Al pasar el mouse, la foto se agranda (`scale 1.06`, 500 ms).
- **Pie:** "Hecho con MyShp" (píldora) y el copyright del comercio.

### Plantilla "hero-banner"

Visto en un comercio de ropa.

- Portada grande con "COLECCIÓN DESTACADA", nombre, frase y "Comprar".
- Pestañas de categorías.
- Título "La colección", buscador y cantidad de artículos.
- Tarjetas `classic`: foto, nombre, precio y **botón "Añadir al pedido" en cada tarjeta**.

### Carrito

- **Botón redondo flotante** de 48 px, abajo a la izquierda (el globito de WhatsApp de la página principal queda a la derecha):
  - fondo de la superficie al 78 % con desenfoque (efecto vidrio);
  - borde suave;
  - número de artículos.
  - Etiqueta accesible: "Abrir carrito, 1".
- **Hoja de pantalla completa** en el celular, con:
  - título "Tu pedido · 1 artículo";
  - **pasos numerados: 1 Carrito → 2 Datos → 3 Confirmar**;
  - líneas con cantidad y "¿Tenés un código de descuento?";
  - subtotal y total;
  - "Continuar" y "Vaciar carrito".
  - Al pie, siempre visible: "Total: …".
- Carrito vacío: "Tu pedido está vacío" y una invitación a explorar el catálogo.

**Para Vidri:** los pasos numerados dan sensación de avance. Hoy nuestra hoja de pedido es de un solo paso: evaluar partirla en Carrito / Tus datos / Confirmar. Los códigos de descuento no están en el diseño: no adelantar.

### Ficha de producto (página propia)

Cada producto tiene su enlace: `/{comercio}/p/{slug}`. Es lo que tenemos pendiente ("ficha con link propio").

- Encabezado fijo arriba, translúcido (blanco al 86 %), con el nombre del comercio.
- Foto, y debajo:
  - nombre del comercio (12 px, peso 700) como sobretítulo;
  - nombre del producto, h1 de 30 px, peso 700;
  - precio en 26 px, peso 600;
  - insignia "Disponible" (píldora verde al 10 %, 12 px, peso 600).
- **Dos botones de 44 px en píldora:** "Añadir al pedido" (acento, relleno) y "Consultar por WhatsApp" (contorno).
- Una aclaración chica: los pedidos se confirman por WhatsApp con el comercio (disponibilidad, pago y envío).

---

## 4. Registro y alta (asistente de 3 pasos)

**Registro:** "Crear cuenta · en menos de 2 minutos" y un solo botón "Empezar", que lleva a su proveedor de acceso. Abajo: "Gratis, sin tarjeta". Tiene un control anti-bots: en un navegador automatizado no deja pasar.

**Armado del asistente** (`/p/dashboard/stores/new`):

- **Barra superior blanca:**
  - logo con "Configuración del comercio";
  - **los 3 pasos como píldoras** en el centro. Activa: verde, 12 px, peso 600. Siguientes: blancas con borde y texto apagado. Hechas: con ✓;
  - "Ayuda" y avatar a la derecha.
- **Línea de progreso** finita debajo de la barra, ocupando el ancho.
- **Tarjeta central** blanca, de 768 px de ancho, padding 40, radio 16 y borde `ink-200`, **sin sombra**, sobre el fondo crema.
- **Arriba de la tarjeta:**
  - "← Volver" en píldora;
  - una píldora "Paso 1 de 3 · Identidad";
  - a la derecha, "33 % completo".
- **Título** en Plus Jakarta 30 px, peso 600, con bajada gris de una línea.
- **Etiquetas** de campo: 12 px, peso 600, color `ink-700`, con asterisco rojo en los obligatorios y un contador a la derecha ("17/60").
- **Campos:**
  - 52 px de alto, texto de 16 px y peso 600;
  - borde verde al enfocar;
  - debajo, una ayuda de 12 px gris ("Es el título público; lo ven en WhatsApp y Google").
- **Botones:** "Continuar →" verde (48 px de alto, radio 14, padding 9 28). "Salir al panel" como texto.
- **Debajo de la tarjeta:**
  - franja verde clara con "¿Necesitás ayuda? Escribinos por WhatsApp" y botón;
  - pie: "Gratis para siempre · Productos ilimitados · Sin comisiones" y "Conexión segura".

**Paso 1 · "¿Qué estás armando?"**

- Nombre (máx. 60).
- **Rubro con tarjetas de ícono** en grilla de 3: ícono en círculo de color suave, título y ejemplos en gris.
  - La elegida: borde verde y fondo verde al 50 %. Las demás: borde fino. Radio 16, padding 14.
  - Al costado dice **"Define el tema del catálogo"**: el rubro elige colores y diseño por defecto.
  - "Ver los 25+ rubros" abre más opciones.
- Frase opcional (máx. 300): "Aparece debajo de la portada y en Google".

**Paso 2 · "¿Dónde te van a encontrar?"**

- **Link con el prefijo fijo** `myshp.link/` dentro del campo, completado solo desde el nombre ("prueba-vidri-cafe"). Al lado, la confirmación verde **"¡Disponible! myshp.link/… es tuyo"**.
- País, provincia y ciudad (en cascada).
- WhatsApp con el prefijo del país, y una etiqueta verde "Acá llegan los pedidos".
- Moneda e idioma del catálogo (27 idiomas).

**Paso 3 · "Verificá y publicá"**

- Un link de Instagram, Facebook o una web para verificar ("1 link alcanza"); foto del local opcional.
- **Resumen antes de publicar**: tabla con nombre, link, WhatsApp, idioma y ubicación, y la insignia "Se publica al enviar".
- Botón "Publicar mi comercio".

**Para Vidri:**

- La estructura es muy parecida a la nuestra (`/nuevo` + `configurar?paso=`). Se puede tomar:
  - la barra de pasos en píldoras + la línea de progreso + "Paso X de N";
  - la confirmación instantánea del link disponible (ya tenemos `slug_available`);
  - **el rubro con tarjetas que define el tema por defecto** (ya tenemos plantillas por rubro con `default_theme`);
  - **el resumen antes de publicar**.
- La verificación por redes no está en nuestro diseño: no adelantar.

---

## 5. Panel del dueño

### Esqueleto (escritorio)

- **Menú lateral** de 239 px, sin fondo propio: el crema de la página.
  - Logo arriba y un título de sección "Administrar" (11 px, peso 600, color `ink-400`).
  - Ítems de 44 px, radio 18, padding 10 12, 14 px, peso 500, ícono de trazo fino.
  - **Ítem activo: píldora negra (`ink-900`) con texto blanco.** Inactivo: texto `ink-600`.
  - Solo 5 secciones: **Inicio, Productos, Pedidos, Plantillas, Ajustes**.
- **Barra superior** blanca de 65 px:
  - botón para plegar el menú;
  - **título de la pantalla** (Plus Jakarta 19 px, peso 600) **con una bajada gris** ("Ventas, visitas y estado del catálogo de un vistazo");
  - campanita con punto rojo y avatar.
- **Contenido** con padding 24, tarjetas blancas de radio 18 y borde `ink-200`, sin sombra.
- **Botón de WhatsApp de soporte** flotante abajo a la derecha, en todas las pantallas.
- **Mientras carga: esqueletos con la misma forma del contenido** (barra, 4 tarjetas, filas). No hay un "Cargando…" genérico.
- En el celular aparece un menú de "Más" con: Plantillas, Ajustes, "Ver mi catálogo", "Todos mis comercios", "Instalar app" y "Soporte". Usa las variables `--tabbar-h` / `--tabbar-clearance` de la sección 1.

### Inicio (Overview)

1. **Tarjeta del link:**
   - "Link del comercio" con la insignia **"● En línea"** (píldora verde clara, 11 px, peso 600);
   - la URL en monoespaciada dentro de un recuadro, con ícono de abrir;
   - a la derecha, "Copiar" (blanco con borde) y **"Compartir"** (verde).
2. **Aviso de soporte** en franja verde clara con el ícono de WhatsApp.
3. **"El primer pedido · 0/2"**: una lista de primeros pasos en tono humano ("Dos cosas separan a este comercio de un cliente: algo para comprar y alguien que vea el link").
   - Paso 01 "Agregá tu primer producto" ("Una foto, un precio, una línea. Un producto real vale más que uno perfecto"), con el botón verde "Agregar producto".
   - Paso 02 "Poné el link frente a alguien" ("Bio de Instagram, estado de WhatsApp…"), con "Copiar link" y "Verlo".
   - Abajo: "El tema y la portada son opcionales: el diseño por defecto ya recibe pedidos" + "Elegir un tema →".
   - Se puede "Ocultar" u "Ocultar para siempre", y se cierra sola con el primer pedido real.
4. **Fila de 4 números** (Estado del comercio, Productos, Categorías, Valor del catálogo).
   - **Truco de diseño:** un solo bloque con radio 18 y fondo `ink-200`, y las 4 celdas blancas separadas por 1 px. Las líneas divisorias salen del fondo.
   - Cada celda: etiqueta de 15 px, un número grande, una línea gris de detalle ("0 publicados · 0 borradores") y un ícono ↗ que lleva a la sección.
5. **Rendimiento** con selector "Hoy / 7 días / 30 días / Todo" y "Actualizar":
   - ventas por WhatsApp, visitas al comercio, pedidos por WhatsApp y conversión;
   - **embudo**: visitas → vistas de producto → agregados al carrito → pedidos por WhatsApp, con porcentajes;
   - productos con más interés;
   - **de dónde llegan** (WhatsApp, Instagram, Google, directo, otros);
   - un consejo final.

### Productos

- **Control segmentado arriba: "Productos 1 | Categorías 0".** El activo es una píldora negra que ocupa la mitad. Productos y categorías viven en la misma pantalla.
- **4 tarjetas de resumen:**
  - Total;
  - Publicados (número verde + insignia "En línea");
  - Borradores (número naranja + insignia "Oculto");
  - Sin categoría.
  - Cada una con un puntito de color en un círculo arriba a la derecha.
- **Barra de herramientas:** buscador ancho ("Buscar nombre, SKU, categoría…"), filtro de stock, "Importar", "Ordenar" y **"+ Producto nuevo"** (verde).
- **Filtros en píldoras** debajo: "Todos 1", "Sin categoría 1".
- **Tabla en tarjeta:**
  - foto redonda de 36 px, nombre en negrita y descripción gris de una línea;
  - categoría, precio, SKU;
  - **estado con dos insignias apiladas** ("● En línea" y "● Con stock");
  - acciones "Historia", "Ver" y **"Editar"** (verde).
- **Estados de stock:** Con stock / Sin stock / Agotado / **A pedido**. Debajo del selector, una frase explica el efecto ("✓ Los clientes pueden agregarlo al pedido normalmente").
- **Visibilidad:** "Publicar en el comercio" / "Guardar como borrador".
- **Vacío:**
  - ícono en un cuadrado redondeado gris;
  - "Todavía no hay productos";
  - una línea de ayuda;
  - "Crear tu primer producto" (verde) e "Importar desde Excel / CSV" (con borde).

**Formulario de producto** (ventana de 418 px, con encabezado de ícono, título y bajada):

- **Pestañas:** "Detalles" y "Variantes y talles" (esta con la etiqueta "Guardá primero" hasta que exista el producto).
- **Fotos:** "Al menos 1 foto · 0/4 fotos · 0/1 video". Se agregan subiendo, por link o como video, en una zona de arrastre con borde punteado.
- **Campos:** nombre, descripción, precio y **"Precio anterior"** (tachado), categoría, SKU (opcional), stock y visibilidad.
- **Estilo de los campos:** fondo `#f4f2ec` (crema, no blanco), borde `ink-200`, radio 12, 43 px de alto.
- **Pie fijo** con "Cancelar" y "Agregar producto". Mientras guarda: "Agregando…" con un spinner y los botones apagados.
- **Variantes:**
  - **atajos por rubro** (Ropa, Calzado, Electrónica, Comida, Belleza, Joyería). "Comida" crea Peso (100 g, 250 g, 500 g, 1 kg) y Pack (1, 2, 6);
  - cada opción en un bloque plegable ("Peso · Botones · 4 valores") con los valores como chips movibles (‹ ›) y quitables (×);
  - cómo se muestra en la ficha: **Botones, Muestras de color, Desplegable o Fotos**;
  - abajo: "12 combinaciones de 4 Peso × 3 Pack" + **"Generar variantes"**.

**"Historia" (Social Story & Flyer Studio):**

- genera una imagen del producto con nombre, precio y **QR al catálogo**;
- formato 9:16 (historia o estado) o 1:1 (publicación);
- 4 estilos (Noche, Dorado, Neón, Minimal);
- botones "Compartir" y "Descargar".

Es una herramienta de marketing muy simple y muy útil para el comercio.

### Plantillas: el editor de diseño (lo más importante)

**Pantalla de tres columnas:**

- **Izquierda:** pasos agrupados.
  - DISEÑO: Página, Colores, Tarjetas, Ficha de producto.
  - SECCIONES: Encabezado, Pie.
  - PERSONALIZAR: Grilla, Marca, Texto.
- **Centro:** el paso actual ("PASO 2 DE 9 · Tema de color"), con buscador, filtros en píldoras y galería de opciones con miniaturas reales. Arriba a la derecha, "Siguiente paso ›".
- **Derecha:** **vista previa en un marco de celular**, con la barra de dirección `myshp.link/prueba-vidri-cafe`. Si el comercio tiene pocos productos, la vista previa usa productos de ejemplo.
- **Barra superior:** "● Todo guardado", "Ver comercio", "Descartar" y **"Aplicar al comercio"**. Nada se publica hasta aplicar.
- Además: **"Guardar como versión"** y **"Versiones"** (historial para volver atrás).

**Los 9 pasos:**

1. **Página (16 opciones)**, con filtros Popular, Visual, Comida y menú, Lujo y Moderno:
   - Estándar limpio, Portada destacada, Editorial minimalista, Menú de pedido rápido (lista, para gastronomía);
   - Lookbook, Grilla bento, Atelier de lujo, Neo-brutalista, Drop con urgencia, Grilla de creador;
   - Carrusel, Lista de precios, Historias en filas, Feed tipo reels, Boutique curada, Perfil de creador.
2. **Colores:**
   - **más de 70 temas con nombre** (Clásico, Apple Glass, Medianoche, Océano, Flor, Esmeralda, Terracota, Matcha, Espresso, Salted Caramel, Oliva toscana…);
   - filtros Claro, Oscuro, Vidrio, Vibrante, Cálido y terroso;
   - cada miniatura muestra la paleta aplicada a una tarjeta, con un ícono de sol o luna;
   - según el rubro, uno lleva la etiqueta **"Mejor opción"**.
3. **Tarjetas (15):**
   - Clásica (foto, nombre, precio y un botón), Minimal (solo foto y precio), Editorial (serif y línea fina);
   - Sobre la foto, Foto redonda, Polaroid, Neo Bold, Brillo nocturno, Vidrio esmerilado;
   - Oferta (sello de descuento), Fila compacta, Fila de precios (sin foto), Carrito flotante, Solo foto, Vitrina.
   - Cada página trae una tarjeta "pareada" por defecto (etiqueta "Pareada").
4. **Ficha de producto:**
   - Clásica (galería y datos, con barra del comercio);
   - Hoja deportiva (miniaturas verticales, talles en píldoras, cantidad y total);
   - Editorial flotante (foto a sangre con una tarjeta de vidrio encima);
   - Boutique, y otras.
   - Cada opción con etiquetas de qué tiene ("Sin encabezado", "Foto a sangre").
5. **Encabezado (4):**
   - Nombre (solo el nombre);
   - Perfil (foto, tilde de verificado y "Abierto para pedidos");
   - Buscador (para catálogos grandes);
   - Cabecera centrada entre dos líneas finas.
   - Opciones aparte: mostrar foto y mostrar la línea de estado.
6. **Pie:** mínimo por defecto (insignia + copyright), o completo con colecciones y contacto; copyright propio; **políticas** (devoluciones, envíos) en un cajón.
7. **Grilla:**
   - productos por fila en el celular: **1 / 2 / 3**;
   - esquinas: **Rectas / Suaves / Redondas / Píldora**;
   - foto: **Cuadrada / Alta / Ancha**;
   - interruptor para los chips de categorías.
   - Todo con controles segmentados de íconos.
8. **Marca:**
   - foto de perfil;
   - **color de acento** (por defecto `#171717`, con selector de color) "para botones, links y destacados";
   - **14 combinaciones de tipografía** con nombre: Grotesca moderna (Sora + Inter), Serif editorial (Instrument Serif + Inter), Lujo (Playfair + DM Sans), Couture (Cormorant + Manrope), Artesanal (Fraunces + Work Sans), Studio (Space Grotesk), Creator (Outfit + DM Sans), Impacto (Bebas Neue), Mono, Redondeada (Fredoka + Nunito), Heritage (Baskerville + Karla), Street (Archivo Black), Minimal (Manrope)…
   - Cada una muestra sus tamaños: título, subtítulo y cuerpo.
9. **Textos:** título del catálogo ("Ver todo"), texto del botón de agregar, texto del botón de WhatsApp y **barra de anuncio**.

### Pedidos

- **Dos tarjetas arriba:**
  - **Cobros:** total, "0 % cobrado", "Cobrado completo" y "Falta cobrar".
  - **Preparación:** Pendientes (amarillo, "Requiere acción"), Confirmados (gris, "En curso") y Completados (verde, "Entregados"), cada uno en su recuadro de color suave; "Editar estados"; "Enviar difusión".
- **Barra:** buscador ("Buscar pedido, cliente, teléfono…"), fechas, estado de pago (por confirmar, pago parcial, pagado, reembolsado, impago), **"+ Venta rápida"** (cargar a mano una venta del local), "Clientes", "Difusiones", "Exportar" y actualizar.
- **Filtros por estado en píldoras de color:** Todos, Pendientes (amarillo), Confirmados (azul), Completados (verde), Cancelados (rojo), cada uno con su número.
- **Vacío:** "Todavía no hay pedidos", con "Ir al catálogo y hacer un pedido de prueba" y "Preguntas del checkout".

### Ajustes

- **Cabecera:**
  - logo (inicial en un cuadrado negro);
  - nombre con las insignias "● En línea" y "Verificado";
  - link, moneda y ciudad;
  - "Copiar link" y "Ver comercio".
- **Índice en chips** para saltar: Identidad, Idioma, N.º de pedido, Páginas, Cargos, Cupones, Preguntas, Stock, Pagos, Estados, WhatsApp y **Peligro** (en rojo).
- **Grupos con título y bajada** ("Configuración del comercio · 4 secciones"), con tarjetas en 2 columnas.
  - Cada tarjeta: ícono, título, una insignia de estado ("En línea", "Configurable", "Ninguna", "Apagado") y una línea de descripción.
  - **A la derecha, el valor actual resumido** ("Español", "ORD-1746-001", "Sin páginas") y una flecha ›.
- **Secciones:**
  - Identidad (nombre, rubro, moneda, ubicación y Google);
  - Idioma;
  - Numeración de pedidos (prefijo propio);
  - Políticas y páginas;
  - Cargos e impuestos (envío fijo, empaque);
  - Cupones y barra de anuncio;
  - Preguntas del checkout ("3 preguntas");
  - Stock (apagado = siempre disponible);
  - Pagos (QR, transferencia, link de pago y comprobante);
  - Estados del pedido con colores;
  - Plantilla del mensaje de WhatsApp;
  - Zona de peligro (borrar el comercio).

### Recorrido de compra (catálogo en escritorio)

- El carrito se abre como **panel lateral derecho** (unos 365 px) y el resto de la página queda **oscurecido y desenfocado**.
- **Pasos con línea de progreso:** ✓ Carrito ─── 2 Datos ─── 3 Confirmar.
- **"Datos del pedido":**
  - recuadro de ayuda arriba;
  - Nombre, Celular (obligatorio) y Dirección;
  - resumen (artículos e importe total);
  - botón negro "Revisar y confirmar pedido →";
  - debajo, "← Volver a los artículos".
- En la barra del catálogo, el carrito muestra un globito con la cantidad.

---

## 6. Panel central (administración de la plataforma)

No es visible: es interno de MyShp. Lo que sí se puede llevar a nuestro panel central (estilo "Grafito"), con los mismos patrones del panel del dueño:

- **Fila de números** con divisorias de 1 px, cada número con su línea de detalle y su ↗.
- **Tablas en tarjeta** con insignias apiladas de estado.
- **Filtros en píldoras de color con contador.**
- **Fichas con índice en chips** y tarjetas de "valor actual + ›".
- Esqueletos de carga con la forma real.
- **Zona de peligro en rojo al final.** Sirve para el borrado definitivo de comercios que está pendiente.

---

## 6b. Segundo recorrido (2026-11-25, en Chrome con capturas grandes)

### Página principal, vista entera

Al usuario le gusta mucho, aunque la ve "muy cargada". Tomar el **nivel de terminación**, con menos elementos.

- **Encabezado flotante:** una píldora blanca separada de los bordes (margen de 12 px), con sombra suave, que queda fija al bajar. Lleva logo, idioma, menú y botón negro.
- **Título de portada con resaltador:** la frase final ("en un link") va en el color de la marca, con una franja verde muy clara detrás, como un marcador.
- **Campo-botón del registro:** una píldora grande con borde oscuro de 1.5 px que contiene "myshp.link/tu-comercio" y el botón negro "Ir al panel →". Debajo, tres tildes verdes en círculos claros.
- **Collage de portada:** 3 capturas reales de catálogos dentro de marcos de teléfono, inclinadas (unos −8° a 8°) y con degradé que se desvanece abajo.
  - Encima flotan tarjetitas blancas con sombra: "Pedido nuevo #1042 · 3 artículos · por WhatsApp" con el ícono verde de WhatsApp, y "✓ Pagado por adelantado".
  - El fondo de la portada lleva **manchas de color muy suaves** (verde menta arriba a la izquierda, lila arriba a la derecha y durazno abajo).
- **Cinta de rubros** que se desplaza sola: píldoras blancas con borde, emoji o ícono y nombre.
- **"Comercios reales":** etiqueta en píldora ("✦ Hecho con MyShp"), título de 2 líneas y carrusel de **marcos de teléfono con el catálogo real**. Abajo de cada uno, una píldora blanca flotante con nombre, rubro y botón redondo negro ↗.
- **"Tres pasos":** 3 tarjetas grandes de **colores pastel distintos** (menta, lila, durazno), con radio de unos 28 px.
  - Cada una tiene un número en un círculo negro, título, texto y una **mini-ilustración hecha con la propia interfaz**: la tarjetita "myshp.link/tu-comercio · ✓ Disponible", 3 miniaturas de productos con precio más un "+" punteado, y chips "Estado de WhatsApp / Bio de Instagram / QR en el paquete".
- **Funciones:** tarjetas pastel (menta, lila, durazno, celeste, rosa, amarillo) en 2 columnas, más una grande arriba.
  - Cada una: ícono en un cuadrado blanco, etiqueta en píldora arriba a la derecha ("Sin comisión", "Carga masiva", "27+ idiomas"), título, texto, una línea divisoria y 3 tildes.
  - La grande muestra un **chat de WhatsApp de mentira** con el pedido armado (renglones, total, hora y doble tilde).
- **Preguntas frecuentes:** título grande alineado a la izquierda, una tarjeta gris "¿Te quedó alguna duda? · Contactanos" y un acordeón con líneas finas. El botón para abrir y cerrar es un círculo (negro con × cuando está abierto, gris con + cuando está cerrado).
- **Cierre:** un bloque **oscuro** de radio grande, con un resplandor violeta en una esquina, dos botones (blanco y con borde) y tres tildes.
- **Pie** gris claro, con las esquinas de arriba redondeadas, el logo, una frase, botones "Crear tu comercio / Ingresar" y columnas Producto / Empresa / Legal.

**Para Vidri (estilo "Noche"):** encabezado en píldora flotante, título con resaltador, collage de teléfonos con avisos flotantes, mini-ilustraciones hechas con nuestra interfaz, tarjetas de colores suaves y el chat de WhatsApp de mentira. **Menos secciones:** portada, ejemplos reales, 3 pasos, 4 funciones, preguntas, cierre.

### Panel en pantalla chica (≈940 px; Chrome no se achica más)

- **Menú inferior flotante:** una píldora blanca centrada, separada 12 px del borde, con sombra.
  - 5 botones de 52 px de alto en píldora: Inicio, Productos, **Agregar** (en el medio), Pedidos y Más.
  - El activo tiene un fondo gris muy suave (tinta al 7 %), sin color fuerte.
  - El menú lateral desaparece.
- **"Más"** abre una **hoja tipo iPhone** desde abajo, con manija arriba:
  - cabecera con la inicial del comercio, nombre y link;
  - dos tarjetas grandes con ícono de color (Plantillas en violeta, Ajustes en gris);
  - "Accesos rápidos" en filas con ícono cuadrado de color (Ver mi catálogo en celeste, Todos mis comercios en naranja, Instalar app en verde) y flecha ›;
  - "Soporte" con WhatsApp.
- "Agregar" abre el formulario de producto nuevo desde cualquier pantalla.
- La lista de productos tiene una **versión en tarjetas** para el teléfono, en lugar de la tabla.
- **El editor de diseño en pantalla chica:** los pasos pasan a una **fila de chips** desplazable arriba, y la vista previa se abre con un botón flotante negro **"👁 Ver comercio"**, en pantalla completa.
  - Arriba: "✕ Editar", el nombre del diseño con su combinación ("Menú de pedido rápido · Matcha Zen · Fila compacta") y el botón blanco "Aplicar".

### Diseños probados en la vista previa (sin aplicar)

- **Al elegir un diseño, se cambian solos el tema de color y la tarjeta que lo acompañan** ("emparejados"). Después se pueden cambiar por separado.
- **Menú de pedido rápido** (gastronomía), con el tema Matcha Zen:
  - filas con foto cuadrada de 64 px, nombre, descripción de 1 línea, precio y precio anterior tachado;
  - botón verde "+ Agregar" a la derecha;
  - chips de categorías en una barra segmentada.
  - Es el más apto para comida: se lee como una carta.
- **Perfil de creador:** avatar grande centrado, nombre, **categorías en círculos con la inicial** (o foto) tipo historias de Instagram y grilla de 2 fotos grandes.
- **Grilla bento** (tema Apple Glass): el **primer producto ocupa todo el ancho**, y después siguen 2 columnas. El encabezado es translúcido y desenfocado al bajar, con el acento azul.

### Ficha con variantes y compra completa

- **Ficha:**
  - sobretítulo con el nombre del comercio en mayúsculas;
  - título de unos 32 px y precio grande;
  - insignia "● Disponible";
  - opción "TAMAÑO" con el valor elegido a la derecha;
  - **botones de valor de 36 px** (radio 8; el elegido negro con texto blanco, el resto blanco con borde);
  - "✓ Con stock";
  - botón negro de ancho completo "Agregar al pedido" y otro con borde "Consultar por WhatsApp";
  - descripción y aclaración chica;
  - **botón de compartir** redondo arriba a la derecha.
- **Carrito:** líneas en tarjetas con foto redonda, la variante como etiqueta ("Grande"), − cantidad + y tacho rojo. Abajo: "¿Tenés un código?", el subtotal y "Total del pedido" en grande. Al pie: "Continuar" negro, "Vaciar carrito" en rojo y el total.
- **Revisar y enviar (paso 3):**
  - bloque "Artículos del pedido (3)" con "Cambiar artículos";
  - bloque "Datos del cliente y entrega" con "Editar";
  - **botón verde WhatsApp** "Enviar pedido por WhatsApp";
  - "← Volver al paso anterior";
  - aclaración: "Al tocar, los detalles quedan listos en WhatsApp".
- **Después de enviar:** dentro de la misma hoja, un círculo con ✓, "¡Pedido enviado por WhatsApp!", el número de pedido (ORD-1746-001), **"Ver el recibo"** y "Seguir comprando".
- **Recibo público con seguimiento** (`/{comercio}/order/{uuid}`):
  - "¡Pedido realizado con éxito!" con fecha y número;
  - insignias "Pendiente" y "Sin pagar";
  - **línea de tiempo de 4 pasos** con íconos (Realizado → Confirmado → En camino → Entregado), cada uno con una explicación corta;
  - bloque de pago por WhatsApp con "Confirmar pedido por WhatsApp";
  - el detalle de los artículos.
- **Mensaje de WhatsApp:** "¡Hola {comercio}! Quisiera hacer este pedido:", con viñetas "• Producto [Variante] × 2 — ARS 7,000", "*Total:*" en negrita y los datos del cliente.

**Errores de MyShp que Vidri no tiene que repetir** (vistos en la prueba):

1. **El precio de la variante no se aplica igual en todos lados.** La ficha y el carrito mostraron 3.500 para "Grande", el WhatsApp dijo 10.500 y el recibo y el panel calcularon 11.500. Le confirma a Vidri que el precio lo calcule solo la base (`private.create_order`) y que el mensaje salga de lo guardado.
2. La ficha **no actualiza el precio** al elegir otra variante.
3. Desde la tarjeta, "Agregar" **saltea la elección** de variante. En Vidri, con opciones obligatorias, primero hay que elegir.
4. La tarjeta muestra "3500" y no "desde 3500".
5. Al revisar el pedido **se pierde el nombre de la variante**.
6. El mensaje **mezcla idiomas** ("Full name", "Mobile number" en un catálogo en español).
7. La hora del recibo no coincide (23:46 contra 20:46: problema de zona horaria).
8. Los botones de variante miden 36 px: el mínimo cómodo para el dedo es 44.
9. Al agregar al carrito solo cambia el número del ícono. Falta una confirmación visible ("Agregado ✓").

### Panel: pedido de prueba (permiso del usuario, a su propio número)

- **Lista:** el pedido aparece con el número, cuánto hace ("hace 1 min") y la fecha.
  - Cliente con ícono de teléfono y un **botón chico de WhatsApp**, más las respuestas en un chip.
  - Artículos ("2 artículos: 2× …, 1× …"), importe.
  - **Estado de preparación y estado de pago como desplegables de color dentro de la fila.**
  - Botón 👁 para el detalle. La tabla se desplaza de costado: no es buena en el teléfono.
- **Detalle (ventana):**
  - número + insignia de estado;
  - **chips para cambiar el estado** (Pendiente, Confirmado, Completado, Cancelado, cada uno con su punto de color);
  - chips de pago (Confirmando pago, Pago parcial, Pagado, Reembolsado, Sin pagar);
  - franja verde **"Aviso al cliente por WhatsApp"** + "Enviar aviso";
  - datos del cliente con "Chatear por WhatsApp";
  - artículos con el total;
  - el texto del pedido para copiar;
  - pie con "Link del recibo", "Copiloto IA" e "Imprimir comprobante".
  - Al cambiar el estado aparece el aviso **"Estado actualizado"** (píldora blanca con tilde verde, arriba al centro).
- **Avisos al cliente en un toque:** encabezado verde, y la etapa se elige con 4 tarjetas con ícono:
  - Confirmado, Despachado, Recordatorio de pago, Entregado / pedir reseña;
  - **vista previa editable** del mensaje con emojis, el número, el total y **el link del recibo con seguimiento**;
  - "Copiar mensaje" y "Abrir en WhatsApp".
  - No manda nada solo: abre WhatsApp con el texto listo.

### Ajustes por dentro

- **Cada sección:**
  - "← Todos los ajustes" y "Ir a sección ▾";
  - cabecera con ícono, título, insignia y bajada;
  - **los chips de secciones** desplazables, con la actual en verde;
  - una **barra de guardado** arriba y abajo: "✓ Todo guardado" en gris y el botón verde, que se apaga si no hay cambios.
- **Preguntas del checkout:**
  - "Vista previa del formulario" y "Volver a lo de fábrica";
  - **"Agregar preguntas comunes"** en chips verdes (Dirección completa, Email, Ciudad y código postal, Horario preferido, Notas);
  - cada pregunta en una tarjeta con número, flechas para ordenar, texto, **tipo** (texto corto, teléfono, texto largo o dirección…), interruptor "Obligatoria" y tacho;
  - "+ Agregar pregunta propia" en un recuadro punteado.
- **Mensaje de WhatsApp:**
  - dos pestañas, "Mensaje del pedido" y "Consulta por producto";
  - 3 plantillas de inicio (Clásica, Detallada, Compacta);
  - **etiquetas para insertar** ({item_name}, {price}, {piece}, {item_total}, {store_name}, {checkout_fields}…), filtrables por "por artículo / del pedido".
- **Estados del pedido:**
  - sugerencias para agregar (En preparación, Enviado, En reparto, Listo para retirar, En espera, Reembolsado);
  - cada estado con insignia de color, "Renombrar", su clave, una descripción, **paleta de 8 colores** y tacho;
  - uno marcado como "Por defecto para pedidos nuevos";
  - un consejo al pie.

### Categorías

- **Alta en línea** (nombre + "Imagen (opcional)" + "Agregar"), y también "Abrir en ventana".
- **Lista:** número de orden en un cuadrado gris, nombre, `/slug · N productos`, "Ver", lápiz y tacho. Arriba, "Ordenar".
- **Franja amarilla de aviso:** "Productos sin categoría · 1 producto no tiene categoría" + "Revisar".
- **Vacío:** ícono, "Todavía no hay categorías", explicación y **consejos** ("nombres claros", "de 5 a 10 categorías es lo ideal").
- Pie: "Las categorías se ven como secciones en tu catálogo; este orden es el que ven los clientes".

### Avisos y errores

- **Avisos breves:** píldora blanca con sombra, arriba al centro, con un círculo verde ✓ ("Variantes guardadas.", "Categoría agregada.") o un círculo rojo ✕ ("Falta el nombre del producto.").
- **Error en el campo:** borde punteado rojo, fondo rosado muy suave, texto rojo y debajo "⚠ Agregá al menos una foto antes de guardar".
- **Confirmaciones de borrado:** usan el cartel nativo del navegador ("¿Seguro?"). Es **feo y bloquea la página**: en Vidri, usar una ventana propia.

---

## 7. Ideas para llevar a Vidri (resumen, a decidir con el usuario)

| Idea | Dónde | Tamaño | Notas |
| --- | --- | --- | --- |
| Paleta teñida desde el color del comercio (fondo, texto, secundario, borde y sombra) | Catálogo | Medio | Mejora mucho sin cambiar la estructura |
| Dos estilos de tarjeta (clásica / sobre la foto) y grilla de 3 columnas sin separación | Catálogo | Medio | Opción en Ajustes → Marca |
| Categorías como círculos tipo historias | Catálogo | Chico | Usa la foto de un producto o de la categoría |
| Barra de anuncio arriba | Catálogo | Chico | Se cruza con "promo del día" (parte 4, Pro) |
| Ficha con enlace propio | Catálogo | Medio | Ya está en pendientes |
| Carrito en 3 pasos | Catálogo | Medio | Sin códigos de descuento |
| Negro = "seleccionado", verde = "hacer" (sección 10) | Panel | Chico | En la página principal el primario es negro; en el panel, verde |
| Fondo crema + superficies blancas + casi sin sombras | Todo | Medio | Encaja con "Sobremesa" |
| Títulos con interletrado negativo fuerte (peso 800, −4 %) | Página principal | Chico | |
| "vidri.ar/ + tu nombre" como inicio del registro | Página principal | Medio | Toca el alta (paso 1 del asistente) |
| **Panel: menú con ítem activo en píldora negra, título + bajada en cada pantalla, tarjetas sin sombra** | Panel del dueño | Medio | Encaja con "Panel fácil"; en el celular se mantiene el menú inferior |
| **Inicio: "El primer pedido" (primeros pasos en tono humano, se cierra con el primer pedido)** | Panel del dueño | Chico | Reemplaza o mejora nuestro `SetupChecklist` |
| Fila de números con divisorias de 1 px y ↗ a cada sección | Panel del dueño y panel central | Chico | |
| Productos y categorías en la misma pantalla (control segmentado) | Panel del dueño | Medio | |
| Estado "A pedido" además de con stock / sin stock | Catálogo + base | Medio | Necesita migración: pasar por el diseño |
| Precio anterior tachado | Catálogo + base | Medio | Columna nueva: pasar por el diseño |
| Atajos de opciones por rubro (Comida: tamaño, extras…) | Panel (opciones) | Chico | Ya tenemos opciones; solo los atajos |
| **"Historia": imagen del producto con QR para Instagram/WhatsApp** | Panel del dueño | Medio | Muy útil para vender; se genera en el navegador |
| **Editor de diseño con vista previa en celular y "Aplicar"** | Panel → Ajustes → Marca | Grande | Empezar chico: color + 6-10 temas + 2 tarjetas + grilla 2/3 + esquinas |
| Asistente: pasos en píldoras + "Paso X de N" + link disponible al instante + resumen antes de publicar | Alta | Medio | |
| Rubro con tarjetas de ícono que elige tema por defecto | Alta | Chico | Ya existe `default_theme` por plantilla |
| Pedidos: filtros de estado en píldoras de color con contador | Panel del dueño | Chico | |
| Ajustes: índice en chips + tarjetas "valor actual ›" + zona de peligro | Panel del dueño | Medio | |
| Esqueletos de carga con la forma real | Todo el panel | Chico | |
| Carrito: panel lateral en escritorio con fondo desenfocado | Catálogo | Chico | |
| **Pantalla de "pedido enviado" + recibo público con seguimiento** | Catálogo + pedidos | Medio | Link sin datos sensibles a la vista; pasar por el diseño (sección de pedidos) |
| **Avisos al cliente en un toque** (Confirmado, Listo, En camino, Entregado) con el texto armado y link | Panel → Pedidos | Chico/Medio | Abre WhatsApp con texto (`wa.me`), no envía solo: encaja con "sin correos automáticos" |
| Estados de pedido y de pago cambiables con chips en el detalle | Panel → Pedidos | Chico | El pago no está en el diseño: solo los estados |
| Menú inferior en píldora flotante con "Agregar" en el medio y hoja "Más" estilo iPhone | Panel (celular) | Medio | Evolución del menú de "Panel fácil" |
| Preguntas del checkout con chips de "preguntas comunes" | Ajustes | Medio | Revisar con el diseño de pedidos |
| Diseño que trae su tema y su tarjeta "emparejados" | Editor de diseño | Chico | Cuando exista el editor |
| Página principal: encabezado en píldora, título con resaltador, collage de teléfonos, tarjetas pastel, chat de mentira | Página principal | Medio | Con menos secciones que MyShp |
| Avisos breves en píldora blanca + error en el campo; confirmar borrados con ventana propia | Todo | Chico | |

**No adelantar** (no está en el diseño o es de otra etapa): cupones, cobros y pagos, difusiones, libreta de clientes, venta rápida, verificación por redes, analítica de embudo, versiones del diseño, idiomas múltiples. Si alguno interesa, pasa primero por `docs/diseno-tecnico-v1.md`.

## 8. Orden sugerido para llevarlo a Vidri

1. **Fundaciones** (sin cambiar funciones): tokens de `sistema-visual.md` (crema, tinta cálida, sin sombras, botones en píldora, tipografía de títulos), esqueletos de carga, menú del panel con píldora negra, título + bajada.
2. **Catálogo:** paleta teñida desde el color del comercio, grilla 2/3, esquinas, dos estilos de tarjeta, categorías en círculos, carrito por pasos.
3. **Panel del dueño:** Inicio con "El primer pedido" y fila de números, Productos con resumen y tabla nueva, Ajustes con índice.
4. **Editor de diseño** con vista previa en celular (empezando por pocas opciones).
5. **Herramientas para vender:** "Historia" con QR, ficha con link propio.

Cada parte: diseño corto en `docs/superpowers/specs/`, OK del usuario, `/diseno-interfaz` y recién después código.

---

## 9. Recorridos entre pantallas

Agregado el 2026-11-26, después de recorrer el panel otra vez en Chrome. Las secciones 2 a 6b dicen **cómo es** cada pantalla; esta dice **cómo se pasa de una a otra**: qué se abre como página, como ventana o como hoja, a dónde se vuelve y qué pasa después de guardar. Al usuario le gustó tanto esto como el aspecto.

### Reglas generales

1. **Página para los lugares, ventana para las tareas.**
   - Son páginas las secciones del menú (Inicio, Productos, Pedidos, Plantillas, Ajustes) y cada ajuste elegido.
   - Crear o editar un producto y ver el detalle de un pedido se abren en una **ventana encima de la lista** (fondo oscurecido al 60 %). Al cerrarla, la lista sigue donde estaba, con el mismo filtro y la misma búsqueda.
   - En el celular, la ventana es una hoja que sube desde abajo. En escritorio, el carrito del catálogo es un panel lateral.
2. **Todo lo que cambia la pantalla queda en la dirección**: `?tab=categories`, `?tab=store`, `?new=1`. Se puede compartir, recargar y volver con Atrás.
   - **Falla de MyShp:** al abrir "Producto nuevo" desde la lista, la dirección no cambia. Entonces Atrás saca de la página en lugar de cerrar la ventana. En Vidri, Atrás siempre cierra la ventana (ya lo hace la ficha del catálogo con `history.pushState`).
3. **Después de guardar, uno se queda donde estaba.** Aparece un aviso breve ("Estado actualizado", "Categoría agregada") y no hay salto a otra pantalla.
4. **Los números son atajos.** Las tarjetas de resumen son botones: "Sin categoría 1" filtra la lista, "Pendientes 0" filtra los pedidos y las celdas del Inicio llevan a su sección con ↗.
5. **Lo frecuente se hace en la fila.** El estado y el pago de un pedido se cambian con un desplegable en la misma fila, sin abrir el detalle. El detalle es para lo que no entra en la fila.
6. **El mismo acceso desde varios lados**: "Agregar producto" está en el Inicio (lleva a `products?new=1`), en la barra de Productos y en el botón del medio del menú del celular. Las tres abren la misma ventana.
7. **Borrar está lejos.** Va al final, en rojo y como texto ("Borrar producto" abajo a la izquierda de la ventana; "Zona de peligro" al final de Ajustes), nunca como botón relleno ni al lado de Guardar.
8. **Cada pantalla dice dónde estás:** título y bajada en la barra de arriba ("Productos · Productos y categorías, juntos").

### Recorrido por recorrido (MyShp → Vidri hoy → qué tomar)

**A. Entrar al panel**

- MyShp: iniciar sesión → "Tus comercios" (tarjeta con inicial, nombre, link, rubro, "● En línea", moneda, ciudad y "Administrar →") → Inicio del comercio. Con un solo comercio también pasa por la lista.
- Vidri hoy: `/panel` → comercio.
- Tomar: si el usuario tiene un solo comercio, entrar directo. La tarjeta con estado sirve cuando tenga varios.

**B. Cargar un producto**

- MyShp: "+ Producto nuevo" → ventana sobre la lista → pestaña "Detalles" (la de "Variantes" dice "Guardá primero") → "Agregar producto" (mientras guarda, "Agregando…") → aviso → sigue en la lista. Esc o "Cancelar" cierran.
- Vidri hoy: página `/productos/nuevo` → al crear, abre la edición (`?nuevo=1`) para sumar fotos y opciones.
- Tomar: la idea de "primero lo básico, después fotos y opciones" ya la tenemos. Lo que suma MyShp es **no sacar al usuario de la lista**. Evaluar una hoja o ventana con estado en la dirección (`?nuevo=1`, `?producto={id}`) y dejar la página propia para el celular si la hoja queda incómoda.

**C. Editar un producto**

- MyShp: "Editar" en la fila → la misma ventana con "Borrar producto" (rojo, izquierda), "Cancelar" y "Guardar cambios" (derecha).
- Vidri hoy: página `/productos/[id]` con bloques.
- Tomar: el orden del pie (peligro solo a la izquierda, secundario y principal a la derecha) y el mismo formulario para crear y editar.

**D. Categorías**

- MyShp: control segmentado "Productos 1 | Categorías 1" dentro de Productos (`?tab=categories`). La tarjeta "Sin categoría" filtra la lista, y la franja amarilla lleva a "Revisar".
- Vidri hoy: página aparte `/categorias`.
- Tomar: unir las dos en Productos con el segmentado. El menú queda con menos ítems.

**E. Atender un pedido**

- MyShp: Pedidos → tarjetas de preparación (que filtran) y píldoras de estado con contador → en la fila: desplegable de estado, desplegable de pago, "Detalle", "Avisar" (verde suave) y WhatsApp → en el detalle: chips de estado → aviso "Estado actualizado" → "Enviar aviso" → elegir etapa → vista previa editable → "Abrir en WhatsApp".
- Vidri hoy: "En curso / Terminados" → página `/pedidos/[id]` → cambiar estado.
- Tomar: cambiar el estado desde la fila, las píldoras con contador y el "Avisar" que termina en WhatsApp con el texto armado. El pago no está en el diseño.

**F. Ajustes**

- MyShp: índice de tarjetas ("valor actual ›") → tocar una → la misma pantalla con `?tab=store` → arriba "← Todos los ajustes" e "Ir a sección", los chips de secciones (el actual en verde, "Peligro" en rojo) → formulario → barra de guardado arriba y abajo, con el botón apagado si no hay cambios.
- Vidri hoy: una sola página larga (Marca, Contacto y entrega, Horarios, Accesos).
- Tomar: el índice con el valor actual, una sección por vez con su dirección y el botón apagado sin cambios. Hoy tenemos pocas secciones: alcanza con el índice y la sección; los chips sirven cuando haya más de 5.

**G. Comprar (catálogo)**

- MyShp: tarjeta → ficha (si hay que elegir) → "Agregar" → carrito (hoja en el celular, panel lateral en escritorio) → 1 Carrito → 2 Datos → 3 Revisar → "Enviar pedido por WhatsApp" → "¡Pedido enviado!" en la misma hoja → recibo.
- Vidri hoy: tarjeta → ficha → hoja de pedido en un solo paso → WhatsApp → "Pedido registrado".
- Tomar: los pasos numerados con "← Volver al paso anterior" y la confirmación visible al agregar. El detalle está en la sección 6b.

---

## 10. Botones y controles del panel (medidos)

Medidos el 2026-11-26 en el panel de escritorio. Los colores son los de MyShp: la traducción a Vidri está en la sección 11.

**La regla de fondo:** **negro = "esto está elegido"** (menú, filtro, segmento) y **verde = "hacé esto"** (crear, guardar, compartir). Nunca se mezclan. El negro no es una acción.

| Rol | Ejemplos | Fondo | Texto | Borde | Alto | Esquinas | Letra |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Principal en barra | "Producto nuevo", "Compartir" | verde `#0f7a55` | blanco | — | 40 | 14 | 14 / 600 |
| Principal en ventana o barra de guardado | "Agregar producto", "Guardar cambios" | verde | blanco | — | 42–44 | píldora | 12 / 600 |
| Principal dentro de una tarjeta | "Agregar producto" (primeros pasos) | verde | blanco | — | 40 | 12 | 11.5 / 600 |
| Secundario | "Importar", "Copiar", "Ver", "Cancelar" | blanco | `#36332c` | 1 px `#c9c3b4` | 40 (44 en ventana) | 12–14 (píldora en ventana) | 12–14 / 500–600 |
| Suave | "Historia", "Libreta", "Enviar difusión" | crema `#efede7` | `#36332c` | 1 px `#e2ded4` | 40 | 12 | 12 / 600 |
| Texto | "Ocultar", "Elegir un tema →", "Editar estados" | — | gris `#4c473e` o verde | — | 32 | — | 11 / 600 |
| Peligro | "Borrar producto"; chip "Peligro" | — o rosado suave | rojo | — | 40 | píldora | 12 / 600 |
| Elegido | ítem del menú, filtro "Todos", segmento | negro `#14120e` | blanco | — | 44 menú y segmento, 30–36 filtro | 18 menú, 12–14 filtro, píldora segmento | 13–14 / 500–600 |
| No elegido | los demás filtros y chips | blanco | `#4c473e` | 1 px suave | igual que el elegido | igual | igual |
| Estado con color | "Pendiente", "Confirmado", "Avisar" | el color al **10 %** | el tono oscuro del color | el color al **30 %** | 30–36 | píldora | 12 / 600 |
| WhatsApp | "Venta rápida", "Probar WhatsApp", soporte | verde WhatsApp | blanco | — | 36–56 | 16–18, redondo el flotante | 12 / 600 |
| Tarjeta tocable | resumen "Sin categoría 1", "Pendientes 0" | blanco o el color suave | negro | 1 px | 93–123 | 16 | — |
| Campo | formulario | crema `#f4f2ec` | negro | 1 px `#e2ded4` | 43 | 12 | 15 / 400 |
| Buscador | barra de la lista | blanco | negro | 1 px `#e2ded4` | 38 | 14 | 14 / 400 |
| Zona para soltar fotos | formulario | crema al 70 % | negro | **2 px punteado** `#c9c3b4` | 119 | 18 | — |

**Reglas que se repiten:**

- **Un solo verde por zona**: uno en la barra, uno en la ventana y uno por tarjeta de primeros pasos. En la tabla, cada fila es una zona y puede tener su "Editar" verde.
- **Orden:** el secundario a la izquierda y el principal a la derecha. El peligro va solo, en el otro extremo.
- **Mientras guarda:** el texto cambia ("Agregando…"), aparece un spinner y los dos botones se apagan.
- **Sin cambios, sin botón:** "Guardar" aparece apagado hasta que se toca algo.
- **Pestañas dentro de una ventana:** subrayado y texto verde en la activa. Una pestaña que todavía no se puede usar lleva una etiqueta ("Guardá primero") en lugar de esconderse.
- **Fondo de las ventanas:** casi negro al 60 %. Ventana de radio 28 (las tarjetas, 16–18).
- **Tamaños:** 30–36 px en chips y acciones de fila es poco para el dedo. En Vidri, 44 px en el celular siempre (regla de `/diseno-interfaz`).

---

## 11. De MyShp a Vidri: colores y decisiones

Cómo se traduce cada valor de MyShp a los tokens de Sobremesa (`docs/design/sistema-visual.md`). **Lo que falta** se crea en la etapa de fundaciones (orden sugerido, paso 1) y se documenta primero en `sistema-visual.md`.

| Rol | MyShp | Vidri (Sobremesa) | Estado |
| --- | --- | --- | --- |
| Fondo de página | `#f7f6f3` crema | `background` `#FBFBF9` | Ya está |
| Superficie (tarjetas, ventanas) | blanco | `surface` | Ya está |
| Texto | `#14120e` | `foreground` `#22261F` | Ya está |
| Texto secundario | `#6b6558` | `muted` `#5F6659` | Ya está |
| Borde fino | `#e2ded4` | `line` `#E3E6DF` | Ya está |
| Fondo suave (botón suave, esqueleto) | `#efede7` | `surface-muted` `#E8EFE7` | Ya está |
| **Acción principal** | verde `#0f7a55` | `accent` verde yerba `#3D6B47` | Ya está: coincide con el panel de MyShp |
| **Elegido** (menú, filtro, segmento) | negro `#14120e` | `foreground` de fondo y `surface` de texto | Nuevo uso, sin token nuevo |
| Borde de botón secundario | `#c9c3b4` (más oscuro que el borde fino) | falta `line-strong` | A crear: contraste 3:1 sobre `surface` |
| Fondo de campo | `#f4f2ec` | falta `field` (apenas más oscuro que `background`) | A crear |
| Verde suave ("Ver comercio", avisos de ayuda) | `#eef7f1` | falta `accent-soft` | A crear |
| Error y borrar | `#b42318` | `danger` / `danger-soft` | Ya está |
| Aviso (pendiente, sin categoría) | amarillo `#9a5b12` | falta `warning` / `warning-soft` | A crear |
| Estados del pedido | 4 colores al 10 % / 30 % | `new` aviso; `confirmed` y `preparing` informativo; `ready` y `completed` `accent`; `cancelled` `danger` | A crear `info` / `info-soft`; cubre los 6 estados de `orders.status` |
| WhatsApp | `#25d366` | solo en lo que abre WhatsApp | Token `whatsapp` a crear, con texto que cumpla AA |
| Títulos | Plus Jakarta 800, interletrado −4 % | `font-display` Young Serif | **Mantener la nuestra** |
| Texto | Inter | `font-sans` Hanken Grotesk | Mantener |
| Botones | 12–14 en barras, píldora en ventanas | píldora siempre (`sistema-visual.md`) | **Mantener la píldora**: es más coherente |
| Sombras | casi ninguna; una "lift" para lo que flota | — | Tomar: sin sombras salvo hojas, avisos y botones flotantes |

**Lo que queda decidido con esto:**

- El botón principal del panel **sigue siendo el verde yerba**. Lo negro de MyShp es de su página principal y de lo "elegido", no de las acciones. La página principal de Vidri tiene su propio estilo ("Noche", con violeta).
- El catálogo no usa estos colores: usa la paleta teñida del color del comercio (sección 3).

**Falta decidir con el usuario:** si lo elegido (menú, filtros) va en negro (`foreground`) o en verde claro con texto verde, como el panel de PPW (`referencia-ppw.md`, sección 6, que al usuario le pareció más limpio), y los valores exactos de los tokens nuevos. Se proponen con una maqueta al empezar la etapa de fundaciones.
