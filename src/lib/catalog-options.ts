/**
 * Listas fijas del catálogo nuevo (docs/superpowers/specs/2026-11-22-catalogo-nuevo-design.md).
 * Coinciden con los CHECK de 20261122220611_catalog_details.sql: si se cambia una, cambiar la otra.
 * Las usan el catálogo público (mostrar) y el panel (formularios).
 */

export const PRODUCT_TAGS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "ultimas_unidades", label: "Últimas unidades" },
  { value: "vegetariano", label: "Vegetariano" },
  { value: "vegano", label: "Vegano" },
  { value: "sin_tacc", label: "Sin TACC" },
  { value: "picante", label: "Picante" },
] as const;
export type ProductTag = (typeof PRODUCT_TAGS)[number]["value"];
export const PRODUCT_TAG_VALUES = PRODUCT_TAGS.map((t) => t.value) as [ProductTag, ...ProductTag[]];

export const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "mercado_pago", label: "Mercado Pago" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];
export const PAYMENT_METHOD_VALUES = PAYMENT_METHODS.map((m) => m.value) as [PaymentMethod, ...PaymentMethod[]];

export const MAX_TAGS = 3;
export const MAX_HIGHLIGHTS = 4;
export const HIGHLIGHT_MAX = 60;
export const MAX_SPECS = 8;
export const SPEC_LABEL_MAX = 30;
export const SPEC_VALUE_MAX = 60;

export type ProductSpec = { label: string; value: string };
