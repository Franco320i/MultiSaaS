# Página principal de Vidri (vidri.ar): diseño

Fecha: 2026-11-20. Estado: borrador para aprobar.

## Intención

`vidri.ar` es lo primero que ve un comerciante que todavía no es cliente. Hoy es una página provisoria (un título y un botón). El usuario quiere una página que **venda**: que en pocos segundos se entienda qué es Vidri, qué problema resuelve, cómo funciona, cuánto sale y cómo empezar, con la calidad visual de un SaaS serio.

**A quién le habla:** dueños de comercios argentinos (gastronomía, ropa y comercios en general) que hoy venden por Instagram y WhatsApp: contestan "¿precio?" una y otra vez, pierden pedidos en los chats y tienen los productos desparramados en historias. No buscan software; buscan menos caos y verse más profesionales.

## Objetivos

- Que el visitante se reconozca en el problema y vea el producto funcionando en los primeros segundos.
- Llevarlo a **"Crear mi catálogo gratis"** (`/registro`), repetido en puntos clave, con el riesgo bajado: 14 días gratis, sin tarjeta, sin comisiones por venta.
- Mostrar los planes leídos de la base (tabla `plans`), así cambiar precios o sumar un plan gratis se hace en un solo lugar.
- Términos y privacidad publicados, con los datos del responsable marcados como pendientes.

## No objetivos (por ahora)

- Testimonios, cifras de uso o logos de clientes: no existen todavía. La sección no se construye hasta tener datos reales.
- Botón de contacto por WhatsApp o correo: se suma cuando el usuario pase el número.
- Facturación anual, comparador detallado de planes, blog, idioma inglés.
- Rediseñar el catálogo, el asistente o el panel (es otro paso del plan).

## Anti-objetivos (fracaso aunque funcione)

- Prometer algo que la app no hace (variantes, stock, dominio propio, varias personas en el panel, quitar la marca).
- Inventar números, testimonios, descuentos o urgencias falsas.
- Que se vea como una plantilla de landing genérica (cards iguales, gradientes por todos lados, íconos de stock, emojis).
- Que sea lenta en el celular o rompa la app (registro, panel, catálogos).
- Que algún dato de un comercio quede fijo en la página (regla de caché del proyecto).

## Restricciones

- Next.js 16 con `cacheComponents`, Tailwind 4, React 19. Ruta `src/app/(marketing)` en el host raíz (`vidri.ar`, `staging.vidri.ar`). Sin dependencias nuevas: animaciones en CSS, íconos como SVG propios.
- Los planes son datos globales (no de un comercio): se leen con el cliente público sin cookies, dentro de una función con `'use cache'` y un tag propio (`plans`), sin `headers()` ni sesión. `check:build` tiene que seguir en verde.
- Accesibilidad AA, objetivos táctiles de 44 px, `prefers-reduced-motion`, celular primero (375 px) y después escritorio.
- Textos en castellano rioplatense con voseo. Plata con `formatCents` (`$ 24.900`).

## Enfoques considerados

| Enfoque | A favor | En contra |
| --- | --- | --- |
| **A. Maquetas dibujadas con código** (elegido) | Carga rápido, nítido en cualquier tamaño, no depende de fotos ni se rompe con cada cambio de diseño | Las "fotos" de productos son bloques de color o ilustraciones |
| B. Capturas de un comercio de ejemplo real | Lo más realista | Hacen falta fotos con permiso y rehacer capturas en cada cambio |
| C. Catálogo real embebido (iframe) | Siempre actualizado | Pesado y lento en el celular; mala primera impresión |

El usuario eligió **A**. Además, el botón "Mirá un catálogo de ejemplo" lleva a un comercio real (`demo.{dominio}`) cuando exista.

## Sistema visual: superficie "Noche"

Nueva superficie, como "Grafito" en el panel central: `data-surface="marketing"` en el layout de `(marketing)`, con tokens propios en `src/app/globals.css` y documentada en `docs/design/sistema-visual.md`. Aprobada por el usuario con una muestra.

| Token | Valor | Rol |
| --- | --- | --- |
| background | `#0B0912` | Fondo casi negro con tinte violeta |
| surface | `#15111F` | Tarjetas y bloques |
| surface-raised | `#1D1830` | Lo que flota (burbuja de pedido, menú móvil) |
| line | `#2B2442` | Bordes y separadores |
| foreground | `#F3F0FA` | Texto principal |
| muted | `#A8A2BD` | Texto secundario (AA sobre fondo) |
| accent | `#7C3AED` | Botón principal (texto blanco, AA) |
| accent-soft | `#C4B5FD` | Énfasis en títulos, links, etiquetas |

- Tipografías de la plataforma: Young Serif en títulos, Hanken Grotesk en el resto.
- Un resplandor violeta suave detrás del hero y del cierre; nada de gradientes en cada sección.
- Las maquetas del catálogo van en los colores del comercio de ejemplo (naranja de la plantilla Gastronomía), no en violeta: el visitante tiene que entender que su catálogo lleva **su** marca.
- Siempre es oscura (no cambia con el modo del sistema): es la identidad de la página.

## Estructura de la página (en orden)

1. **Menú fijo:** logo "vidri." · Cómo funciona · Funciones · Planes · Preguntas · Ingresar (→ `app.{dominio}/auth/login`) · botón "Probar gratis". En el celular, menú desplegable accesible.
2. **Hero:**
   - Etiqueta "Catálogos con pedidos a WhatsApp".
   - Título: *"Dejá de mandar fotos y precios por WhatsApp. Tu catálogo, con tu marca, en un link."*
   - Bajada: *"Tus clientes eligen, arman el pedido y te llega al WhatsApp ya escrito. Vos lo manejás todo desde el celular."*
   - Botones: "Crear mi catálogo gratis" y "Mirá un catálogo de ejemplo" (este último solo si existe el comercio de ejemplo).
   - Línea de riesgo: "14 días gratis · Sin tarjeta · Sin comisiones por venta".
   - Maqueta: celular con catálogo de una hamburguesería ficticia ("Burger del Centro") y la burbuja del pedido que llega a WhatsApp, con una animación suave de entrada.
3. **El problema y la solución (antes y después):** a la izquierda un chat desordenado ("¿precio?", "¿tenés en talle M?", fotos sueltas); a la derecha el mismo pedido llegando ordenado. Tres frases cortas: productos en un solo lugar, un link profesional para compartir, pedidos que llegan escritos.
4. **Cómo funciona (3 pasos):** 01 Creás tu cuenta · 02 Cargás tus productos (uno por uno o pegándolos desde una planilla) · 03 Compartís el link y el QR. Línea horizontal en escritorio, vertical en el celular.
5. **Funciones (grilla con jerarquía, no cards iguales):** cada bloque con su mini maqueta. Solo lo que existe hoy:
   - Catálogo con fotos, categorías y destacados (bloque grande).
   - Pedido que llega a WhatsApp ya escrito (bloque grande).
   - Panel de pedidos con estados (nuevo, confirmado, en preparación, listo, entregado, cancelado) y aviso de pedidos nuevos.
   - Tu marca: logo, portada y color.
   - Horarios con "Abierto ahora"; envío o retiro, con costo y pedido mínimo.
   - Precio anterior tachado y etiqueta "Sin stock".
   - Cargá productos desde una planilla.
   - QR para el mostrador y link para Instagram.
   - Frase destacada: "Sin comisiones por venta. Pagás el abono y listo."
6. **Ejemplo en vivo:** franja que invita a abrir el comercio de ejemplo. Se muestra solo si existe y está publicado.
7. **Planes:** una tarjeta por plan público de la tabla `plans` (ordenados por `sort`), con nombre, precio por mes, "14 días gratis, sin tarjeta" y botón "Empezar gratis" → `/registro`. Se destaca como recomendado el plan de mayor `sort`. Solo se listan límites que funcionan hoy: cantidad de productos (`max_products`, `null` = ilimitados) y fotos por producto (`max_images_per_product`). Todos los planes incluyen la lista común de funciones. Los precios actuales son provisorios: el usuario todavía no definió los planes.
8. **Preguntas frecuentes** (acordeón nativo `<details>`): ¿Necesito saber de tecnología? · ¿Funciona en el celular? · ¿Cómo me llegan los pedidos? · ¿Cobran comisión por venta? · ¿Puedo cambiar precios cuando quiera? · ¿Qué pasa cuando terminan los 14 días? · ¿Cómo doy de baja? Respuestas solo con lo que la app hace: el cobro es mensual y manual, no hay permanencia; si no se paga, el catálogo se pausa.
9. **Cierre:** *"Empezá a vender de una manera más profesional."* · *"Tu catálogo puede estar listo para compartir en pocos minutos."* · botón "Crear mi catálogo gratis".
10. **Pie:** logo, links a las secciones, Ingresar, Términos, Privacidad, © año Vidri.

## Páginas legales

- `/terminos` y `/privacidad`, con el mismo estilo "Noche", texto legible y ancho de lectura cómodo.
- Borrador redactado a partir de lo que la plataforma hace (datos de comercios y de compradores: nombre, teléfono, dirección, notas; Supabase como proveedor, cookies solo de sesión en el panel, Ley 25.326 de protección de datos personales).
- Los datos del responsable (nombre o razón social, CUIT, domicilio, correo) quedan como `[PENDIENTE]` visibles y la página lleva `noindex`. Antes de producción (etapa 10e) hay que completarlos y que los revise un abogado.

## Lo que decidió el usuario

- Propuesta basada en psicología de ventas: problema → prueba → facilidad → valor → precio sin riesgo → objeciones → cierre.
- Enfoque A (maquetas con código).
- Estética oscura negro y violeta (superficie "Noche"), con la paleta de la muestra.
- Precios provisorios, tomados de la base.

## Decisiones mías (para revisar)

- Mantener Young Serif y Hanken Grotesk para no cortar la identidad entre la página y la app.
- No construir todavía la sección de cifras y testimonios.
- El botón del comercio de ejemplo se muestra solo si `demo.{dominio}` existe y está publicado (consulta cacheada a `storefront_by_host`), para no mandar a nadie a "Catálogo no encontrado".
- Los 14 días de prueba van como constante en el código, con un comentario que apunta a `provision_tenant` (donde está el valor real).
- Plan recomendado: el de mayor `sort`.
- `/registro` está en la misma ruta `(marketing)`, así que también toma "Noche": usa los mismos tokens (`bg-surface`, `accent`) y cambia sin tocar su código. Revisar contraste del formulario y del widget de Turnstile sobre fondo oscuro.
- Metadatos para buscadores y redes (título, descripción, imagen para compartir generada con `next/og` en los mismos colores).

## Lo que queda para quien lo construya

- Componentes en `src/app/(marketing)/_components/` (son de esa ruta; no son un módulo de negocio).
- Detalle de las mini maquetas, animaciones exactas y microtextos, siguiendo esta guía.
- Verificar a 375 px y 1280 px en el navegador, `npm run check`, build y `check:build`, y que `/registro` y el resto de la app sigan igual.
