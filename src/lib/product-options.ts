/**
 * Opciones del producto (parte 3): lógica compartida por el catálogo (ficha) y los pedidos
 * (carrito). Sin React ni Next. El precio y la validación que valen los hace
 * private.create_order en la base; esto es para mostrar y para no dejar elegir mal.
 */

export type ProductOption = { id: string; name: string; priceDelta: number; isAvailable: boolean };
export type ProductOptionGroup = {
  id: string;
  name: string;
  required: boolean;
  maxChoices: number;
  options: ProductOption[];
};

export type SelectionCheck =
  | { ok: true }
  | { ok: false; group: string; reason: "missing" | "too_many" | "unavailable" };

export function validateSelection(groups: ProductOptionGroup[], selected: readonly string[]): SelectionCheck {
  const known = new Map(groups.flatMap((g) => g.options.map((o) => [o.id, { group: g, option: o }] as const)));
  for (const id of selected) {
    const hit = known.get(id);
    if (!hit) return { ok: false, group: "", reason: "unavailable" };
    if (!hit.option.isAvailable) return { ok: false, group: hit.group.name, reason: "unavailable" };
  }
  for (const group of groups) {
    const chosen = group.options.filter((o) => selected.includes(o.id)).length;
    if (chosen > group.maxChoices) return { ok: false, group: group.name, reason: "too_many" };
    if (group.required && chosen === 0) return { ok: false, group: group.name, reason: "missing" };
  }
  return { ok: true };
}

export function unitPrice(base: number, groups: ProductOptionGroup[], selected: readonly string[]): number {
  return groups
    .flatMap((g) => g.options)
    .filter((o) => selected.includes(o.id))
    .reduce((sum, o) => sum + o.priceDelta, base);
}

/** Lo más barato que se puede pedir: el producto más la opción disponible más barata de cada obligatorio. */
export function fromPrice(base: number, groups: ProductOptionGroup[]): number {
  return groups
    .filter((g) => g.required)
    .reduce((sum, g) => {
      const deltas = g.options.filter((o) => o.isAvailable).map((o) => o.priceDelta);
      return sum + (deltas.length > 0 ? Math.min(...deltas) : 0);
    }, base);
}

/** "Doble, Panceta": lo elegido en el orden de los grupos y de las opciones. */
export function selectionLabel(groups: ProductOptionGroup[], selected: readonly string[]): string {
  return groups
    .flatMap((g) => g.options)
    .filter((o) => selected.includes(o.id))
    .map((o) => o.name)
    .join(", ");
}

/** Clave de una línea del carrito: el producto y sus opciones ordenadas. */
export function lineKey(productId: string, optionIds: readonly string[]): string {
  return optionIds.length === 0 ? productId : `${productId}:${[...optionIds].sort().join(",")}`;
}
