import { lineKey } from "@/lib/product-options";

/**
 * Líneas del carrito (sin React): una por producto + combinación de opciones.
 * Solo IDs y cantidades: nombres y precios salen del catálogo y la base los recalcula.
 */

export type CartLine = { productId: string; optionIds: string[]; quantity: number };

export const MAX_LINES = 50;
export const MAX_QUANTITY = 99;

const validQuantity = (q: unknown): q is number => Number.isInteger(q) && (q as number) >= 1 && (q as number) <= MAX_QUANTITY;

/** Carrito viejo (pedido:v1, sin opciones). */
export function parseCartV1(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l) => typeof l?.productId === "string" && validQuantity(l?.quantity))
    .map((l) => ({ productId: l.productId as string, optionIds: [], quantity: l.quantity as number }))
    .slice(0, MAX_LINES);
}

export function parseCartV2(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (l) =>
        typeof l?.productId === "string" &&
        Array.isArray(l?.optionIds) &&
        l.optionIds.length <= 50 &&
        l.optionIds.every((id: unknown) => typeof id === "string") &&
        validQuantity(l?.quantity),
    )
    .map((l) => ({ productId: l.productId as string, optionIds: [...(l.optionIds as string[])], quantity: l.quantity as number }))
    .slice(0, MAX_LINES);
}

export const keyOf = (line: Pick<CartLine, "productId" | "optionIds">) => lineKey(line.productId, line.optionIds);

export function addLine(lines: CartLine[], productId: string, optionIds: string[], quantity = 1): CartLine[] {
  const key = lineKey(productId, optionIds);
  const existing = lines.find((l) => keyOf(l) === key);
  if (existing) return setLineQuantity(lines, key, existing.quantity + quantity);
  if (lines.length >= MAX_LINES) return lines;
  return [...lines, { productId, optionIds, quantity: Math.min(MAX_QUANTITY, quantity) }];
}

export function setLineQuantity(lines: CartLine[], key: string, quantity: number): CartLine[] {
  const q = Math.max(0, Math.min(MAX_QUANTITY, Math.round(quantity)));
  if (q === 0) return lines.filter((l) => keyOf(l) !== key);
  return lines.map((l) => (keyOf(l) === key ? { ...l, quantity: q } : l));
}
