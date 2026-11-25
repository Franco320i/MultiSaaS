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
- [ ] Panel central: no se puede ver, es interno de ellos. Se infiere del panel del dueño (sección 6).

Comercio de prueba creado en MyShp: `myshp.link/prueba-vidri-cafe`, con un producto. Es de la cuenta del usuario y se puede borrar desde Ajustes → Zona de peligro.

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

**El primario es negro, no de color.** El verde de la marca aparece en detalles: palabras resaltadas del título, insignias, tildes y el globito de WhatsApp. Por eso el color "vale más".

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

## 7. Ideas para llevar a Vidri (resumen, a decidir con el usuario)

| Idea | Dónde | Tamaño | Notas |
| --- | --- | --- | --- |
| Paleta teñida desde el color del comercio (fondo, texto, secundario, borde y sombra) | Catálogo | Medio | Mejora mucho sin cambiar la estructura |
| Dos estilos de tarjeta (clásica / sobre la foto) y grilla de 3 columnas sin separación | Catálogo | Medio | Opción en Ajustes → Marca |
| Categorías como círculos tipo historias | Catálogo | Chico | Usa la foto de un producto o de la categoría |
| Barra de anuncio arriba | Catálogo | Chico | Se cruza con "promo del día" (parte 4, Pro) |
| Ficha con enlace propio | Catálogo | Medio | Ya está en pendientes |
| Carrito en 3 pasos | Catálogo | Medio | Sin códigos de descuento |
| Botón primario negro y la marca en detalles | Página principal y panel | Chico | Revisar con "Noche" y "Sobremesa" |
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

**No adelantar** (no está en el diseño o es de otra etapa): cupones, cobros y pagos, difusiones, libreta de clientes, venta rápida, verificación por redes, analítica de embudo, versiones del diseño, idiomas múltiples. Si alguno interesa, pasa primero por `docs/diseno-tecnico-v1.md`.

## 8. Orden sugerido para llevarlo a Vidri

1. **Fundaciones** (sin cambiar funciones): tokens de `sistema-visual.md` (crema, tinta cálida, sin sombras, botones en píldora, tipografía de títulos), esqueletos de carga, menú del panel con píldora negra, título + bajada.
2. **Catálogo:** paleta teñida desde el color del comercio, grilla 2/3, esquinas, dos estilos de tarjeta, categorías en círculos, carrito por pasos.
3. **Panel del dueño:** Inicio con "El primer pedido" y fila de números, Productos con resumen y tabla nueva, Ajustes con índice.
4. **Editor de diseño** con vista previa en celular (empezando por pocas opciones).
5. **Herramientas para vender:** "Historia" con QR, ficha con link propio.

Cada parte: diseño corto en `docs/superpowers/specs/`, OK del usuario, `/diseno-interfaz` y recién después código.
