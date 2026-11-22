# Catálogo nuevo: una plantilla para todos, ficha del producto y datos del local (parte 2)

Fecha: 2026-11-22 · Estado: aprobada por el usuario (2026-11-22)

Parte 2 de 4 del catálogo para Base y Pro (contexto y orden en `2026-11-22-tarjeta-resultados-design.md`). Maquetas: https://claude.ai/artifact/WpMXexp1PqCh5yLm3tNQvb (la B, Vidriera, es la base).

**Decisión del usuario (2026-11-22): todos los catálogos usan la misma plantilla.** El dueño personaliza la portada (foto, logo, nombre, frase, color de la marca) y sus datos, pero el diseño es siempre el mismo. Se descartan los dos diseños elegibles (Carta/Vidriera) que proponía la primera versión de este documento.

## Por qué

El usuario encontró flojo el catálogo que ven los clientes de cada local. Quiere que se vea más completo y profesional, con más información que carga el dueño, con una plantilla única y prolija para todos los locales, donde cada uno pone su portada, su logo y su color. Es lo que más pesa en la primera impresión de los locales que van a probar.

## Qué se construye

### 1. Una sola plantilla: grilla de fotos

- Grilla de dos columnas con fotos grandes (4:5): foto, etiqueta, nombre, precio (y "Ahorrás" si está en oferta) y un botón **"Agregar"** en la tarjeta, para que en comida se pueda pedir rápido sin abrir la ficha. Tocar la foto o el nombre abre la ficha.
- **"Ordenar por precio"** (de menor a mayor y de mayor a menor) para todos.
- La portada es lo que personaliza cada local: foto de portada, logo, nombre, frase y color de la marca (ya existen en Ajustes → Marca).
- Un producto sin foto se ve como un bloque del color de la marca con su nombre (como hoy los destacados sin foto).
- En pantallas grandes pasa a 3 columnas (4 en pantallas muy anchas), centrada.
- **Buscador** arriba de las categorías ("Buscar en el catálogo"): filtra al instante por nombre, descripción y etiquetas, sin recargar ni volver a la base (el catálogo ya está en la página). Sin resultados: "No encontramos «…». Probá con otra palabra." y un botón para borrar la búsqueda.
- **Categorías como botones rellenos** (píldoras): la elegida rellena con el color de la marca, las demás con borde. Reemplazan al subrayado de hoy; siguen fijas arriba y se deslizan de costado.

### 2. Ficha del producto

- Al tocar un producto se abre una hoja con todas sus fotos (se pasan con el dedo, con puntitos que marcan cuál se ve), nombre, etiquetas, precio (y el anterior tachado), descripción completa y "Agregar".
- En el celular **sube desde abajo** y deja ver un borde del catálogo detrás (no tapa toda la pantalla); en pantallas grandes, ventana centrada como la hoja del pedido.
- **Características** (nuevo): una tabla de dos columnas debajo del precio ("Material · Lino", "Capacidad · 256 GB"). La carga el dueño en el producto: hasta 8 filas, nombre de hasta 30 letras y valor de hasta 60.
- **El botón dice qué hace y cuánto suma:** "Agregar · $ 9.000". Si ya está en el pedido, pasa al selector de cantidad de siempre.
- Se cierra con la X, con "Atrás" del celular o con Escape. Foco atrapado adentro mientras está abierta.

### 3. Etiquetas en los productos

- Lista fija (no texto libre, para que se vean prolijas y no haya faltas): **Nuevo, Últimas unidades, Vegetariano, Vegano, Sin TACC, Picante.**
- **Según el rubro** (agregado el 2026-11-22, a pedido del usuario): la plantilla es la misma, pero el panel ofrece las etiquetas del rubro. Gastronomía: Nuevo, Vegetariano, Vegano, Sin TACC, Picante. Dietética: Nuevo, Últimas unidades, Vegetariano, Vegano, Sin TACC. Indumentaria y Tecnología: Nuevo, Últimas unidades, **Liquidación**, **Importado**. General: Nuevo, Últimas unidades, Liquidación. La base acepta la lista completa, así un comercio que cambia de rubro no pierde sus etiquetas (`tagOptionsFor` en `src/lib/catalog-options.ts`, migración `20261122231325_catalog_tags_by_business.sql`).
- **Oferta** aparece sola cuando el producto tiene precio anterior, y debajo del precio se lee **"Ahorrás $ 2.000"** (en la grilla y en la ficha).
- Hasta 3 por producto. Se eligen con casillas en el formulario del producto.
- "Más pedido" no es una etiqueta manual: es parte de los destacados de Pro (parte 4), calculado con los pedidos reales.

### 4. Datos del local arriba

Debajo del nombre y el estado (abierto o cerrado):

- **Dirección con botón "Cómo llegar"** (si cargó dirección): abre Google Maps con la dirección y la ciudad, en una pestaña nueva.

Una fila de chips:

- **Envío y mínimo:** salen de lo que ya está cargado (costo de envío, pedido mínimo, si hace envíos). Si solo retira: "Solo retiro".
- **Medios de pago** (nuevo): casillas en Ajustes → Contacto: Efectivo, Transferencia, Mercado Pago, Débito, Crédito.
- La fila se desliza de costado si no entra.

Y un recuadro **"Todos los pedidos incluyen"** (nuevo, opcional): hasta 4 frases que escribe el dueño, de hasta 60 letras ("Funda de regalo", "Cambios hasta 30 días", "3 cuotas sin interés con tarjeta"). Cada una con un tilde dibujado, sin emojis. Si no cargó ninguna, no aparece.

### Fuera de esta parte

- Opciones del producto (talles, tamaños, extras con precio): parte 3. La ficha queda lista para sumarlas; un producto con opciones abrirá la ficha en vez de agregarse directo.
- Destacados (promo, "Lo más pedido", combos): parte 4, solo Pro.
- Link propio de cada producto para compartir (pendiente aparte).
- Pasar a Sobremesa las pantallas viejas del panel (productos, categorías, menú).

## Cómo se construye

- **Base (una migración, con `/nueva-tabla` y sus pruebas pgTAP):**
  - `tenant_settings.payment_methods text[]` (solo valores de la lista), `highlights text[]` (hasta 4, de hasta 60 letras cada una).
  - `catalog_products.tags text[]` (solo valores de la lista, hasta 3) y `catalog_products.specs jsonb` (lista de `{label, value}`, hasta 8, con los largos de arriba; validada con un CHECK por función inmutable o trigger).
  - Las columnas nuevas siguen los permisos por columna de su tabla: ajustes solo el dueño; etiquetas dueño y staff (como el resto del producto).
  - `public.storefront_by_host` (nueva versión, misma firma) devuelve los medios de pago y los datos extra. Sigue en la lista cerrada de `security definer`.
- **Catálogo público:** `getPublicCatalog` trae todas las fotos de cada producto (ordenadas) las etiquetas y las características. Sigue cacheado por comercio y se invalida igual que hoy. `StorefrontView` pasa a la grilla; la ficha, el buscador y el orden por precio son componentes de cliente del módulo catálogo; la ficha recibe el botón "Agregar" por el mismo espacio de hoy (`productAction`), así catálogo no importa pedidos (el botón de pedidos suma una variante ancha con el precio). Íconos dibujados en SVG, nunca emojis.
- **Panel:** casillas de etiquetas y filas de características (agregar, quitar) en el formulario de producto; medios de pago y "Todos los pedidos incluyen" en Ajustes → Contacto (el mismo formulario aparece en el asistente). Todo validado con Zod y con `revalidatePublicCatalog` o la invalidación de ajustes que ya existe.
- **Lo que no cambia:** pedidos, carrito, `create_order`, planes y límites.
- **Pruebas:**
  - pgTAP: valores fuera de la lista rechazados, más de 3 etiquetas, más de 4 frases o más de 8 características rechazados, staff no cambia ajustes, anónimo ve los datos nuevos solo de comercios públicos.
  - Unitarias: textos de los chips (envío, mínimo, solo retiro, medios), etiquetas visibles (con Oferta automática, máximo 3), "Ahorrás", búsqueda (sin acentos ni mayúsculas: "cafe" encuentra "Café"), orden por precio y link de "Cómo llegar".
  - E2E: el recorrido de pedido sigue pasando con la grilla; abrir la ficha y agregar desde ahí.
- Sistema visual: se documenta en `docs/design/sistema-visual.md` (grilla, ficha, buscador, chips, etiquetas).

## Ideas tomadas de un catálogo de referencia

El 2026-11-22 el usuario mostró un catálogo que le gustó (una tienda de iPhone) por lo simple y fácil de usar. Se tomaron sus ideas, no su diseño: buscador, categorías en píldoras, "Cómo llegar", recuadro de lo que incluye cada compra, "Ahorrás", ficha que sube desde abajo con características, botón que dice qué hace y orden por precio. Se descartó: emojis como íconos (algunos no se ven en todos los celulares), listas desplegables para elegir variantes (en la parte 3 se usan botones tocables), la ruedita de "Cargando…" y precios en dos monedas.

## Enfoques considerados

1. **Una sola plantilla de grilla para todos (elegido por el usuario).** Un solo diseño para cuidar y mejorar; todos los catálogos se ven profesionales; la identidad de cada local está en la portada y el color.
2. Dos diseños según el rubro (Carta para comida, Vidriera para ropa): era la primera propuesta; el usuario prefirió una plantilla única.
3. Plantillas totalmente separadas por rubro: cinco veces el trabajo, sin ganancia clara hoy.

## Decisiones mías para revisar

- La grilla con "Agregar" en cada tarjeta (además de en la ficha), para pedir rápido en comida.
- La lista fija de etiquetas y el máximo de 3.
- Los medios de pago de la lista.
- Título fijo "Todos los pedidos incluyen" para el recuadro (no lo escribe el dueño).
- La búsqueda y el orden no quedan guardados: al recargar, el catálogo vuelve al principio.
