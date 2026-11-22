import { describe, expect, it } from "vitest";
import { tagOptionsFor } from "./catalog-options";

const values = (key: string, current: string[] = []) => tagOptionsFor(key, current).map((t) => t.value);

describe("tagOptionsFor: etiquetas según el rubro", () => {
  it("comida: las de comida, sin las de ropa", () => {
    expect(values("gastronomia")).toEqual(["nuevo", "vegetariano", "vegano", "sin_tacc", "picante"]);
  });
  it("ropa y tecnología: sin Picante ni Sin TACC", () => {
    expect(values("indumentaria")).toEqual(["nuevo", "ultimas_unidades", "liquidacion", "importado"]);
    expect(values("tecnologia")).toEqual(["nuevo", "ultimas_unidades", "liquidacion", "importado"]);
  });
  it("dietética y general", () => {
    expect(values("dietetica")).toEqual(["nuevo", "ultimas_unidades", "vegetariano", "vegano", "sin_tacc"]);
    expect(values("general")).toEqual(["nuevo", "ultimas_unidades", "liquidacion"]);
  });
  it("un rubro desconocido usa las de General", () => {
    expect(values("otro")).toEqual(["nuevo", "ultimas_unidades", "liquidacion"]);
  });
  it("conserva las que el producto ya tiene aunque no sean de su rubro (no se pierden al guardar)", () => {
    expect(values("indumentaria", ["picante"])).toEqual(["nuevo", "ultimas_unidades", "liquidacion", "importado", "picante"]);
  });
});
