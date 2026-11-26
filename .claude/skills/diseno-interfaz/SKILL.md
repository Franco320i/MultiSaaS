---
name: diseno-interfaz
description: Dirección visual y reglas de interfaz de este SaaS (panel de comercios, panel central y catálogo público) para que no quede genérico ni "de plantilla". Usala SIEMPRE antes de crear o cambiar pantallas, componentes, estilos, colores, tipografías, formularios, listados, estados vacíos o el catálogo público, aunque el pedido sea chico ("agregá un botón", "mejorá esta pantalla", "armá el catálogo").
---

# Diseño de interfaz

El producto compite contra Tiendanube y contra catálogos hechos a mano. Lo que lo diferencia es que se siente **hecho para el comercio de barrio argentino**: claro, cálido, rápido en el celular y sin pasos de más. Una interfaz genérica (gris, cards iguales, íconos de stock, textos neutros traducidos) lo hace parecer una plantilla más.

Hay **tres superficies con objetivos distintos**:

| Superficie | Quién la usa | Qué tiene que lograr |
| --- | --- | --- |
| Catálogo público (`/sites/[host]`) | Compradores, desde Instagram o WhatsApp, casi siempre en el celular | Que se vea como **la marca del comercio**, no la nuestra; elegir y pedir en segundos |
| Panel del comercio (`/panel`) | Dueños y staff, muchas veces desde el celular, entre clientes | Hacer la tarea en pocos toques, sin dudas, con lenguaje de mostrador |
| Panel central (`/admin`) | El dueño de la plataforma | Ver excepciones rápido (quién no pagó, quién no vende); densidad de información |

## 1. Primero, el sistema visual

La fuente de verdad visual es `docs/design/sistema-visual.md`.

- **Si no existe todavía:** antes de diseñar pantallas, proponele al usuario 2 o 3 direcciones visuales concretas para el panel. Cada una con nombre, una frase de intención, paleta (con valores), par tipográfico y un ejemplo de cómo se vería una pantalla clave (por ejemplo, el listado de productos). Mostralas como una página que se pueda ver (artifact o vista previa en el navegador), no solo descriptas. Cuando elija, registrá la decisión en ese archivo y llevala a tokens.
- **Si existe:** seguilo. Si una pantalla necesita algo que el sistema no cubre, extendelo y documentalo ahí, en lugar de inventar un estilo suelto.

**Referencia de calidad:** `docs/design/referencia-myshp.md` reúne lo que el usuario tomó como modelo (2026-11-25): tokens medidos, estructura del panel, editor de diseño, asistente y catálogo, más una tabla de ideas y el orden sugerido. Consultalo antes de rediseñar una pantalla: tomá los **patrones** (jerarquía, medidas, comportamiento), nunca la marca, los textos ni el código, y aplicalos con los colores de Vidri. Lo que se adopte pasa primero a `sistema-visual.md`.

Al usuario le gustan tanto el aspecto como **el flujo de pantallas y los botones**. Antes de tocar una pantalla, leé también:
- **Sección 9 (recorridos):** página para los lugares y ventana u hoja para las tareas; todo estado en la dirección (Atrás cierra la ventana); después de guardar uno se queda donde estaba, con un aviso breve; los números son atajos; lo frecuente se hace en la fila; borrar va lejos y en rojo.
- **Sección 10 (botones):** negro = elegido, verde = hacer; un solo principal por zona; secundario a la izquierda y principal a la derecha; "Guardar" apagado sin cambios; "Guardando…" mientras guarda.
- **Sección 11 (de MyShp a Vidri):** qué token nuestro reemplaza cada color suyo y qué tokens faltan crear. El principal del panel sigue siendo `accent` (verde yerba) y los títulos siguen en `font-display`.

**Referencia del catálogo público:** `docs/design/referencia-ppw.md` (2026-11-26), un catálogo tipo "carta de restaurante" que al usuario le gustó mucho. Tiene la tarjeta de estado, el buscador fijo, la tarjeta "Carta" (foto a la derecha), el segundo color de marca, el carrito y una tabla de ideas. Leela antes de tocar el catálogo, con las mismas reglas: patrones sí, marca y textos no. Su sección 6 es el **panel de PPW**, que al usuario le pareció muy limpio: cabecera igual en todas las pantallas (sobretítulo + título + bajada + una acción), ítem activo en verde claro, estados en píldoras de color y pocos elementos por pantalla. En el panel: **la calma visual de PPW con los recorridos de MyShp**.

El catálogo público no usa la identidad de la plataforma: usa la del comercio (`tenant_settings.theme`, logo, portada) sobre plantillas por rubro (`business_templates`). Diseñá las plantillas para que el comercio se reconozca: una hamburguesería no se ve como una tienda de ropa.

## 2. Tokens, no valores sueltos

- Colores, tipografías, radios, sombras y espaciados viven como variables en `src/app/globals.css` (bloque `@theme` de Tailwind 4) y se usan por nombre (`bg-surface`, `text-muted`), no con valores sueltos (`bg-[#f3f3f3]`, `text-gray-500`).
- Tipografía: una fuente con carácter para títulos y una muy legible para texto y números; cargalas con `next/font`. Evitá el combo por defecto (Geist/Inter solos) salvo que el sistema lo elija a propósito.
- Precios y cantidades con números tabulares (`tabular-nums`) para que se alineen.
- Modo oscuro: definilo en tokens (`prefers-color-scheme`) y revisá contraste en ambos.

## 3. Señales de "genérico" que hay que evitar

- Todo en grises con un solo azul de acento.
- Grillas de cards idénticas sin jerarquía; todo con el mismo peso visual.
- Sombras y bordes redondeados por todos lados "porque sí".
- Íconos decorativos sin función o emojis como íconos.
- Textos de plantilla: "Bienvenido a tu dashboard", "No data", "Submit", "Something went wrong".
- Estados vacíos con un dibujo genérico y nada que hacer.
- Botones primarios repetidos en la misma pantalla.

En su lugar: una acción principal clara por pantalla, jerarquía tipográfica marcada, color con significado (estado de pedido, disponible/agotado) y detalles propios del rubro.

## 4. Lenguaje

- Castellano rioplatense con voseo, como habla el dueño del local: "Cargá tu primer producto", "Tus pedidos de hoy", "Se guardó".
- Corto y concreto. Botones con verbo y objeto ("Crear producto", no "Aceptar").
- Errores que dicen qué pasó y qué hacer ("Ese precio no es válido: escribí, por ejemplo, 18.000"), nunca códigos ni inglés.
- Plata en formato argentino (`formatCents` en `src/lib/money.ts`): `$ 18.000`.

## 5. Estados de cada pantalla

Diseñá los cinco, no solo el feliz:
1. **Cargando:** esqueleto con la forma del contenido (no un spinner suelto en el medio de la nada).
2. **Vacío:** qué es esto, por qué está vacío y el botón para empezar ("Todavía no tenés productos. Cargá el primero").
3. **Con datos:** la jerarquía pensada para la tarea más frecuente.
4. **Error:** mensaje humano y cómo reintentar.
5. **Sin permiso o no existe:** un 404 propio, sin revelar si el comercio existe.

## 6. Celular primero

- Diseñá a 375 px de ancho y después ampliá. Objetivos táctiles de 44 px como mínimo.
- En el catálogo: el carrito y el botón de pedir siempre a mano (barra inferior fija), fotos grandes, categorías como navegación horizontal.
- En el panel: acciones principales al alcance del pulgar; tablas que en el celular se convierten en listas.

## 7. Accesibilidad (no es opcional)

- Contraste AA como mínimo (4,5:1 en texto normal).
- Todo control con nombre accesible que diga su estado ("Disponible. Tocar para cambiar a Sin stock").
- Foco visible, navegación con teclado, `label` en cada campo, imágenes con `alt` útil.
- No comunicar nada solo con color.

## 8. Cómo verificar

1. Abrí la pantalla en el navegador integrado a 375 px y a 1280 px (`resize_window`) y sacá capturas.
2. Mirá las capturas con ojos de cliente: ¿se entiende qué hacer en 3 segundos? ¿Se ve como una plantilla?
3. Revisá los cinco estados y el modo oscuro.
4. Si una decisión cambia el sistema visual, actualizá `docs/design/sistema-visual.md`.

Para exploración visual libre (por ejemplo, la landing), podés combinar con la skill `frontend-design`, pero el sistema visual del proyecto manda.
