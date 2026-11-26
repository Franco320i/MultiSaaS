import { MAX_TAGS, PAYMENT_METHODS, PRODUCT_TAGS } from "@/lib/catalog-options";
import { formatCents } from "@/lib/money";

/**
 * Lógica de presentación del catálogo público (sin React ni Next: se prueba sola).
 * docs/superpowers/specs/2026-11-22-catalogo-nuevo-design.md
 */

/** Etiquetas visibles: "Oferta" primero si hay precio anterior, después las del producto en el orden de la lista. */
export function visibleTags(p: { tags: readonly string[]; price: number; compareAtPrice: number | null }): string[] {
  const labels: string[] = [];
  if (p.compareAtPrice !== null && p.compareAtPrice > p.price) labels.push("Oferta");
  for (const tag of PRODUCT_TAGS) if (p.tags.includes(tag.value)) labels.push(tag.label);
  return labels.slice(0, MAX_TAGS);
}

export function savingsLabel(price: number, compareAtPrice: number | null, currency: string): string | null {
  if (compareAtPrice === null || compareAtPrice <= price) return null;
  return `Ahorrás ${formatCents(compareAtPrice - price, currency)}`;
}

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type SearchableProduct = { name: string; description: string | null; tags: readonly string[] };

/** Cada palabra buscada tiene que aparecer en el nombre, la descripción o el nombre de una etiqueta. */
export function filterProducts<T extends SearchableProduct>(products: T[], query: string): T[] {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) return products;
  return products.filter((p) => {
    const tagLabels = PRODUCT_TAGS.filter((t) => p.tags.includes(t.value)).map((t) => t.label);
    const haystack = normalizeSearch([p.name, p.description ?? "", ...tagLabels].join(" "));
    return words.every((w) => haystack.includes(w));
  });
}

export type PriceOrder = "none" | "asc" | "desc";

export function sortByPrice<T extends { price: number }>(products: T[], order: PriceOrder): T[] {
  if (order === "none") return products.slice();
  const sign = order === "asc" ? 1 : -1;
  return products
    .map((p, i) => ({ p, i }))
    .sort((a, b) => sign * (a.p.price - b.p.price) || a.i - b.i)
    .map(({ p }) => p);
}

/** Datos de la tarjeta de estado del catálogo: envío (o solo retiro), mínimo y medios de pago. */
export function storeStatus(s: {
  accepts_delivery: boolean;
  accepts_pickup: boolean;
  delivery_fee: number;
  min_order_amount: number;
  payment_methods: readonly string[];
  currency: string;
}): { delivery: string | null; minimum: string | null; payments: string | null } {
  const payments = PAYMENT_METHODS.filter((m) => s.payment_methods.includes(m.value)).map((m) => m.label);
  return {
    delivery: s.accepts_delivery
      ? s.delivery_fee > 0
        ? formatCents(s.delivery_fee, s.currency)
        : "Gratis"
      : s.accepts_pickup
        ? "Solo retiro"
        : null,
    minimum: s.min_order_amount > 0 ? formatCents(s.min_order_amount, s.currency) : null,
    payments: payments.length > 0 ? payments.join(" · ") : null,
  };
}

export function mapsUrl(address: string | null, city: string | null): string | null {
  const street = address?.trim();
  if (!street) return null;
  const query = [street, city?.trim()].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Forma de mostrar los productos según el rubro (rediseño 11b). La decide el rubro y el
 * comercio no la cambia: Carta (fila con la foto a la derecha) para comida, dietética y
 * general; Grilla (fotos grandes) para ropa y tecnología.
 */
export type CatalogLayout = "carta" | "grilla";

const GRID_TEMPLATES = new Set(["indumentaria", "tecnologia"]);

export function catalogLayout(templateKey: string): CatalogLayout {
  return GRID_TEMPLATES.has(templateKey) ? "grilla" : "carta";
}

/** Filtro de la lista de productos del panel (rediseño 11c). Sale de la dirección. */
export type PanelProductFilter = { kind: "all" | "out" | "uncategorized" | "hidden" } | { kind: "category"; id: string };

type PanelProduct = { category_id: string | null; is_available: boolean; is_published: boolean };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePanelProductFilter(params: { categoria?: string; ver?: string }): PanelProductFilter {
  if (params.ver === "sin-stock") return { kind: "out" };
  if (params.ver === "ocultos") return { kind: "hidden" };
  if (params.categoria === "sin") return { kind: "uncategorized" };
  if (params.categoria && UUID_RE.test(params.categoria)) return { kind: "category", id: params.categoria };
  return { kind: "all" };
}

/** Sin stock cuenta solo los publicados: un oculto no se puede pedir de todos modos. */
const isOut = (p: PanelProduct) => p.is_published && !p.is_available;

export function productCounts(products: PanelProduct[]): {
  all: number;
  outOfStock: number;
  uncategorized: number;
  hidden: number;
  byCategory: Map<string, number>;
} {
  const byCategory = new Map<string, number>();
  for (const p of products) if (p.category_id) byCategory.set(p.category_id, (byCategory.get(p.category_id) ?? 0) + 1);
  return {
    all: products.length,
    outOfStock: products.filter(isOut).length,
    uncategorized: products.filter((p) => p.category_id === null).length,
    hidden: products.filter((p) => !p.is_published).length,
    byCategory,
  };
}

export function filterPanelProducts<T extends PanelProduct>(products: T[], filter: PanelProductFilter): T[] {
  switch (filter.kind) {
    case "out":
      return products.filter(isOut);
    case "uncategorized":
      return products.filter((p) => p.category_id === null);
    case "hidden":
      return products.filter((p) => !p.is_published);
    case "category":
      return products.filter((p) => p.category_id === filter.id);
    default:
      return products;
  }
}
