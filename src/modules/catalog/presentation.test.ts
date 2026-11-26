import { describe, expect, it } from "vitest";
import {
  catalogLayout,
  filterProducts,
  mapsUrl,
  normalizeSearch,
  savingsLabel,
  sortByPrice,
  storeStatus,
  visibleTags,
} from "./presentation";

const NBSP = " "; // formatCents usa espacio duro entre $ y el número

describe("visibleTags", () => {
  it("muestra las etiquetas en el orden de la lista", () => {
    expect(visibleTags({ tags: ["picante", "nuevo"], price: 100, compareAtPrice: null })).toEqual(["Nuevo", "Picante"]);
  });
  it("suma Oferta primero cuando hay precio anterior, sin pasar de 3", () => {
    expect(visibleTags({ tags: ["vegano", "nuevo", "picante"], price: 100, compareAtPrice: 200 })).toEqual([
      "Oferta",
      "Nuevo",
      "Vegano",
    ]);
  });
  it("ignora etiquetas desconocidas", () => {
    expect(visibleTags({ tags: ["raro"], price: 100, compareAtPrice: null })).toEqual([]);
  });
});

describe("savingsLabel", () => {
  it("dice cuánto se ahorra", () => {
    expect(savingsLabel(900_000, 1_100_000, "ARS")).toBe(`Ahorrás $${NBSP}2.000`);
  });
  it("sin precio anterior, o si no es mayor, no dice nada", () => {
    expect(savingsLabel(900_000, null, "ARS")).toBeNull();
    expect(savingsLabel(900_000, 900_000, "ARS")).toBeNull();
  });
});

describe("búsqueda", () => {
  const products = [
    { id: "1", name: "Café con leche", description: null, tags: [] },
    { id: "2", name: "Doble cheddar", description: "Dos medallones y panceta", tags: ["picante"] },
    { id: "3", name: "Garbanzo", description: "Medallón de garbanzos", tags: ["vegano"] },
  ];
  it("normaliza acentos, mayúsculas y espacios", () => {
    expect(normalizeSearch("  CAFÉ   con Leche ")).toBe("cafe con leche");
  });
  it("encuentra sin acentos ni mayúsculas", () => {
    expect(filterProducts(products, "cafe").map((p) => p.id)).toEqual(["1"]);
  });
  it("busca en las etiquetas por su nombre", () => {
    expect(filterProducts(products, "VEGANO").map((p) => p.id)).toEqual(["3"]);
  });
  it("cada palabra tiene que aparecer (en nombre o descripción)", () => {
    expect(filterProducts(products, "doble ched").map((p) => p.id)).toEqual(["2"]);
    expect(filterProducts(products, "medallon").map((p) => p.id)).toEqual(["2", "3"]);
  });
  it("vacío devuelve todo", () => {
    expect(filterProducts(products, "  ")).toHaveLength(3);
  });
});

describe("sortByPrice", () => {
  const products = [
    { id: "a", price: 300 },
    { id: "b", price: 100 },
    { id: "c", price: 300 },
  ];
  it("ordena de menor a mayor y de mayor a menor, estable", () => {
    expect(sortByPrice(products, "asc").map((p) => p.id)).toEqual(["b", "a", "c"]);
    expect(sortByPrice(products, "desc").map((p) => p.id)).toEqual(["a", "c", "b"]);
  });
  it("sin orden deja todo como estaba y no modifica la lista original", () => {
    expect(sortByPrice(products, "none").map((p) => p.id)).toEqual(["a", "b", "c"]);
    sortByPrice(products, "asc");
    expect(products.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});

describe("storeStatus", () => {
  const base = {
    accepts_delivery: true,
    accepts_pickup: true,
    delivery_fee: 150_000,
    min_order_amount: 500_000,
    payment_methods: ["transferencia", "efectivo"],
    currency: "ARS",
  };
  it("envío, mínimo y medios de pago en el orden de la lista", () => {
    expect(storeStatus(base)).toEqual({
      delivery: `$${NBSP}1.500`,
      minimum: `$${NBSP}5.000`,
      payments: "Efectivo · Transferencia",
    });
  });
  it("envío gratis", () => {
    expect(storeStatus({ ...base, delivery_fee: 0 }).delivery).toBe("Gratis");
  });
  it("solo retiro, sin mínimo ni medios de pago", () => {
    expect(storeStatus({ ...base, accepts_delivery: false, min_order_amount: 0, payment_methods: [] })).toEqual({
      delivery: "Solo retiro",
      minimum: null,
      payments: null,
    });
  });
});

describe("mapsUrl", () => {
  it("arma la búsqueda de Google Maps con dirección y ciudad", () => {
    expect(mapsUrl("Mitre 450", "Santa Rosa")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Mitre%20450%2C%20Santa%20Rosa",
    );
  });
  it("sin ciudad usa solo la dirección y codifica caracteres raros", () => {
    expect(mapsUrl("Peña & Roca 12", null)).toBe("https://www.google.com/maps/search/?api=1&query=Pe%C3%B1a%20%26%20Roca%2012");
  });
  it("sin dirección no hay link", () => {
    expect(mapsUrl(null, "Santa Rosa")).toBeNull();
    expect(mapsUrl("  ", "Santa Rosa")).toBeNull();
  });
});

describe("catalogLayout", () => {
  it("comida, dietética y general van en Carta; ropa y tecnología en Grilla", () => {
    expect(catalogLayout("gastronomia")).toBe("carta");
    expect(catalogLayout("dietetica")).toBe("carta");
    expect(catalogLayout("general")).toBe("carta");
    expect(catalogLayout("indumentaria")).toBe("grilla");
    expect(catalogLayout("tecnologia")).toBe("grilla");
  });
  it("un rubro desconocido va en Carta", () => {
    expect(catalogLayout("otro")).toBe("carta");
  });
});
