# Panel fácil: panel del dueño simple y tarjetas con borde

Fecha: 2026-11-23 · Estado: aprobado por el usuario (maquetas https://claude.ai/artifact/SnARzUzDbJCRoSdtSwpBas)

## Por qué

El usuario encontró el panel poco intuitivo para "una persona no muy amiga de la web" y las tarjetas del catálogo sin borde. Se hace antes de la parte 3 (talles y extras), que suma campos justo en el formulario del producto.

## Qué se construye

1. **Menú**: en el celular, barra fija abajo con íconos y texto (Inicio, Pedidos, Productos, Mi local), la sección actual marcada, y en Pedidos un número con los pedidos nuevos. En computadora (desde 768 px) el mismo menú va arriba. Mi local = Ajustes (solo el dueño; el staff ve tres botones). Categorías se entra desde Productos.
2. **Inicio**: aviso de pedidos nuevos arriba (si hay), tarjeta de resultados, cuatro botones grandes (Cargar producto, Precios y stock, Ver mi catálogo, Compartir) y la lista de pendientes del dueño.
3. **Productos**: buscador (en el navegador), filtros por categoría y "Ocultos", filas enteras tocables con foto, nombre, precio y categoría, **interruptor "Hay stock / Sin stock"** en cada fila (cambia al instante), botón flotante "+ Producto" y un menú "Más" con Categorías e Importar planilla. Ordenar productos sigue disponible al filtrar por categoría, con flechas grandes.
4. **Formulario del producto por bloques**: Fotos (arriba, en editar), Lo básico (nombre, precio, precio anterior, categoría), interruptores con explicación ("Se ve en tu catálogo", "Hay stock", "Destacado") y "Más detalles" plegado (descripción, etiquetas, características). "Guardar" fijo abajo. Al crear un producto se abre su edición para sumar fotos.
5. **Categorías**: tarjetas con cantidad de productos, flechas grandes de 44 px, botón "+ Nueva categoría".
6. **Catálogo**: cada tarjeta de producto con fondo blanco, borde suave y esquinas redondeadas.

## Cómo

- Solo interfaz: sin cambios en la base ni en permisos. El interruptor usa `setProductFlagAction` (ya existe, con `requireTenantAccess`) con actualización optimista.
- Tokens Sobremesa en todas estas pantallas y en `src/ui/form.tsx` (los formularios genéricos), íconos SVG, objetivos de 44 px, contraste AA.
- El número de pedidos nuevos lo lee el menú con la sesión (cuenta de `orders` en estado `new`, RLS).
- Pruebas: E2E del interruptor de stock (apagar → el catálogo muestra "Sin stock"; volver a prender) y de la navegación; las existentes siguen pasando.

## Fuera de esta parte

Pantallas de categoría nueva/editar e importar (quedan con el formulario genérico restilizado), asistente de alta, Pedidos y Ajustes (ya en Sobremesa).
