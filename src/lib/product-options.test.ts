import { describe, expect, it } from "vitest";
import { fromPrice, lineKey, selectionLabel, unitPrice, validateSelection, type ProductOptionGroup } from "./product-options";

const groups: ProductOptionGroup[] = [
  {
    id: "g1",
    name: "Tamaño",
    required: true,
    maxChoices: 1,
    options: [
      { id: "simple", name: "Simple", priceDelta: 0, isAvailable: true },
      { id: "doble", name: "Doble", priceDelta: 150000, isAvailable: true },
    ],
  },
  {
    id: "g2",
    name: "Extras",
    required: false,
    maxChoices: 2,
    options: [
      { id: "panceta", name: "Panceta", priceDelta: 80000, isAvailable: true },
      { id: "huevo", name: "Huevo", priceDelta: 50000, isAvailable: false },
      { id: "cebolla", name: "Cebolla", priceDelta: 0, isAvailable: true },
    ],
  },
];

describe("validateSelection", () => {
  it("acepta el obligatorio con extras dentro del máximo", () => {
    expect(validateSelection(groups, ["doble", "panceta", "cebolla"])).toEqual({ ok: true });
  });
  it("pide el grupo obligatorio que falta", () => {
    expect(validateSelection(groups, ["panceta"])).toEqual({ ok: false, group: "Tamaño", reason: "missing" });
  });
  it("frena dos en un grupo de una", () => {
    expect(validateSelection(groups, ["simple", "doble"])).toEqual({ ok: false, group: "Tamaño", reason: "too_many" });
  });
  it("no deja elegir una agotada ni una que no existe", () => {
    expect(validateSelection(groups, ["simple", "huevo"])).toEqual({ ok: false, group: "Extras", reason: "unavailable" });
    expect(validateSelection(groups, ["simple", "x"])).toEqual({ ok: false, group: "", reason: "unavailable" });
  });
  it("un obligatorio con todas sus opciones agotadas no se puede completar", () => {
    const agotado: ProductOptionGroup[] = [{ ...groups[0], options: groups[0].options.map((o) => ({ ...o, isAvailable: false })) }];
    expect(validateSelection(agotado, [])).toEqual({ ok: false, group: "Tamaño", reason: "missing" });
  });
  it("un producto sin grupos siempre está completo", () => {
    expect(validateSelection([], [])).toEqual({ ok: true });
  });
});

describe("precios", () => {
  it("unitario = producto + adicionales elegidos", () => {
    expect(unitPrice(800000, groups, ["doble", "panceta"])).toBe(1030000);
    expect(unitPrice(800000, groups, [])).toBe(800000);
  });
  it("'Desde' = lo más barato que se puede pedir (mínimo de cada obligatorio)", () => {
    expect(fromPrice(800000, groups)).toBe(800000);
    const caro: ProductOptionGroup[] = [{ ...groups[0], options: [{ id: "a", name: "Grande", priceDelta: 100000, isAvailable: true }] }];
    expect(fromPrice(800000, caro)).toBe(900000);
  });
});

describe("textos y carrito", () => {
  it("nombra lo elegido en el orden de los grupos", () => {
    expect(selectionLabel(groups, ["panceta", "doble"])).toBe("Doble, Panceta");
    expect(selectionLabel(groups, [])).toBe("");
  });
  it("la misma combinación en otro orden es la misma línea", () => {
    expect(lineKey("p1", ["b", "a"])).toBe(lineKey("p1", ["a", "b"]));
    expect(lineKey("p1", [])).toBe("p1");
    expect(lineKey("p1", ["a"])).not.toBe(lineKey("p2", ["a"]));
  });
});
