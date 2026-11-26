/**
 * Puerta de entrada del módulo pedidos para las rutas (diseño, sección 2).
 * - Catálogo: AddToCartButton y Ordering (componentes de cliente).
 * - Panel: lecturas, piezas visuales y StatusActions. Server Actions en "@/modules/orders/actions".
 * - Crear pedidos (clave secreta): "@/modules/orders/server".
 */
export { AddToCartButton } from "./components/add-to-cart";
export { OrdersAutoRefresh } from "./components/auto-refresh";
export { FulfillmentLabel, StatusPill } from "./components/order-parts";
export { Ordering, type OrderingConfig } from "./components/ordering";
export { StatusActions } from "./components/status-actions";
export { clockTime, dayAndTime, timeAgo } from "./format";
export { countNewOrders, getOrder, getOrderStats, getTenantTimeZone, listOrders, type OrderDetail, type OrderListItem } from "./queries";
export { describeOrderStats, type OrderStats } from "./stats";
export { NEXT_STEP, STATUS_LABEL, type OrderStatus } from "./status";
