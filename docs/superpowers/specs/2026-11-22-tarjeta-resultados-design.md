# Tarjeta de resultados en el panel (parte 1 del catálogo para Base y Pro)

Fecha: 2026-11-22 · Estado: aprobada y construida (2026-11-22)

## Contexto: el trabajo completo y el orden acordado

El 2026-11-22 el usuario decidió:

- **No hay plan Free.** Quedan Base y Pro, con los 14 días de prueba.
- El catálogo combina las propuestas de https://claude.ai/artifact/WpMXexp1PqCh5yLm3tNQvb: diseño **A (Carta)** o **B (Vidriera)** según el rubro, más el bloque de **destacados (C)** que el dueño prende si quiere.
- **Base:** catálogo nuevo (A o B), ficha de producto, etiquetas, datos del local, opciones del producto y esta tarjeta de resultados.
- **Pro:** todo lo de Base más los destacados (promo del día, "Lo más pedido", combos), además de lo que ya tenía (8 fotos, productos ilimitados, 3 miembros, dominio propio, sin marca Vidri).

Orden, cada parte terminada, probada y en staging antes de la siguiente:

1. **Tarjeta de resultados** (este documento).
2. Catálogo nuevo: A o B según rubro, ficha del producto, etiquetas, medios de pago y datos del local.
3. Opciones del producto (talles, tamaños, extras con precio): toca el carrito y `private.create_order`.
4. Destacados (Pro): promo del día, "Lo más pedido", combos.

## Por qué

El usuario quiere que el dueño vea con números que Vidri le sirve, sin correos: algo que vea cada vez que abre el panel. Es lo que justifica seguir pagando.

## Qué se ve

Una tarjeta arriba del inicio del panel (`/[tenant]`), debajo del nombre del comercio:

```
NOVIEMBRE
42 pedidos · $ 380.000
+18% que en el mismo período de octubre · El más pedido: Doble cheddar
```

- **Mes:** el mes en curso, en la zona horaria del comercio (`tenant_settings.timezone`).
- **Pedidos y monto:** pedidos del mes que no estén cancelados; el monto es la suma de `total` (con envío).
- **Comparación:** contra los mismos días del mes anterior (del 1 al día de hoy), para que a mitad de mes no parezca que se vende menos. Sube en verde con "+", baja sin color con "−" (sin alarmar). Si el mes anterior no tuvo pedidos en ese período, no se muestra.
- **El más pedido:** el producto con más unidades del mes (por `product_name`, la copia guardada en el pedido). Con empate, el de más pedidos.
- **Vacío:** si no hay pedidos este mes, "Todavía no recibiste pedidos en noviembre. Compartí el link de tu catálogo para recibir el primero." con el link al catálogo si está publicado.
- La ven el dueño y el staff: el staff ya ve los pedidos con sus montos.
- Estilo Sobremesa (tokens), número grande en `font-display`, cifras con `tabular-nums`.

**Agregado a pedido del usuario:** el inicio completo pasa a Sobremesa. Nombre del comercio en `font-display`, estado como etiqueta (en rojo si hay pago pendiente o suspensión), "Ver mi catálogo" si está publicado, la tarjeta, la lista de pendientes (dueño) y los accesos como lista con detalle: Pedidos ("N nuevos sin atender" en verde), Productos, Categorías y Ajustes (solo el dueño). El menú superior del panel sigue como está.

## Cómo se construye

- **Base:** una función `public.tenant_order_stats(p_tenant_id uuid, p_now timestamptz default now())` (migración `20261122144903_orders_tenant_order_stats.sql`, pruebas en `supabase/tests/09_order_stats.test.sql`) `security invoker` (no `security definer`: corre con la sesión y RLS deja ver solo los pedidos de los comercios del usuario). Devuelve en un solo viaje: pedidos y monto del mes, pedidos y monto del mismo período del mes anterior, y el producto más pedido. Usa el índice `(tenant_id, created_at)` que ya existe. Migración nueva con sus pruebas pgTAP: dueño y staff ven los números de su comercio; otro comercio, anónimo y usuario sin comercio reciben ceros (RLS), y los cancelados no cuentan.
- **El `tenant_id` sale de `requireTenantAccess`**, nunca del navegador.
- **Cálculo y textos en TypeScript puro** (porcentaje, signo, nombre del mes, texto vacío) con pruebas unitarias.
- **Nada se cachea:** es panel.
- Sin cambios en planes: Base y Pro la tienen.

## Fuera de esta parte

- Pasar a Sobremesa el menú superior, productos y categorías (pendiente "pantallas viejas").
- Gráficos, historial de meses o estadísticas por producto.
- Mostrar números en el catálogo público.

## Enfoques considerados

1. **Función en la base con RLS (elegido):** un solo viaje, los conteos los hace Postgres, la seguridad la pone RLS.
2. Traer los pedidos del mes y sumar en el servidor: simple, pero un comercio con muchos pedidos trae miles de filas en cada visita al inicio.
3. Una tabla de resúmenes que se actualiza con cada pedido: más rápida, pero agrega una tabla, triggers y riesgo de que el número se desfase. No hace falta con los volúmenes de hoy.
