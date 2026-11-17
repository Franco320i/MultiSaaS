# 0002 · Pedidos: cómo se implementó lo que el diseño no detallaba

Fecha: 2026-11-17 · Estado: aceptada · Etapa 7

Completa la sección 11 del diseño (`docs/diseno-tecnico-v1.md`). Si se cambia algo de esto, actualizar también el diseño.

## Decisiones

1. **Envoltorios `public.create_order` y `public.rate_limit_hit`.** La API de Supabase solo expone el esquema `public`, así que el servidor no puede llamar a `private.create_order` directamente. Los envoltorios son `SECURITY INVOKER` (no `definer`) y solo `service_role` los puede ejecutar. Con la clave publicable responden 401/42501. No amplían la lista cerrada de funciones `security definer` en `public`.
2. **`private.create_order` responde con códigos** (`products_unavailable`, `below_minimum`, etc.) y el servidor los traduce a mensajes en castellano. `products_unavailable` devuelve en `detail` los IDs a sacar del carrito: solo los que mandó el navegador, sin decir si existen en otro comercio.
3. **Abierto o cerrado lo controla el endpoint, no la base.** Usa la misma lógica de horarios que el catálogo (`src/lib/hours.ts`). Sin horarios cargados y en modo automático, se aceptan pedidos.
4. **Estados solo hacia adelante.** Se pueden saltear pasos (por ejemplo, de nuevo a entregado), pero no volver atrás. Entregado y cancelado son finales. Lo hace cumplir un trigger de la base, y cada cambio emite `order.status_changed` con el usuario que lo hizo.
5. **`SUPABASE_SECRET_KEY` no está en `src/lib/env.ts`.** La lee y valida solo `src/lib/supabase/service.ts`, porque `env.ts` también lo carga el proxy. ESLint permite importar `service.ts` solo desde `src/modules/orders/create.ts` (lista `SERVICE_KEY_ALLOWED`).
6. **Orden en el servidor:** validar → abierto → Turnstile → límites → `create_order`. Turnstile va antes de los límites para que un bot sin token no gaste el cupo por comercio (200 por hora).
7. **El carrito guarda solo IDs y cantidades.** Nombres y precios se toman del catálogo actual, y lo que ya no se puede pedir se oculta del carrito.
8. **El catálogo y los pedidos no se importan entre sí.** `StorefrontView` (módulo catálogo) tiene espacios (`productAction`, `children`) que llena la ruta con componentes del módulo pedidos.

## Pendiente respecto del diseño

- **Notas internas del pedido.** La tabla de políticas del diseño dice que el staff puede editar "estado y notas internas", pero la tabla de columnas de `orders` no tiene esa columna. En v1 solo se cambia el estado. Si se quieren, agregar `internal_notes` con su permiso de `UPDATE` por columna y sus pruebas.
