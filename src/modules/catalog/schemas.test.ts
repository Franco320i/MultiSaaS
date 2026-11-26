import { describe, expect, it } from "vitest";
import { categoryFormSchema, firstError, optionGroupSchema, optionSchema, productFormFromData, productFormSchema, productQuickSchema } from "./schemas";

/** Igual que hacen las Server Actions: Object.fromEntries(formData). */
function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return Object.fromEntries(data);
}

describe("productFormSchema con datos de un formulario real", () => {
  it("acepta un producto sin casillas tildadas (el navegador no manda esos campos)", () => {
    const parsed = productFormSchema.safeParse(form({ name: "Papas", price: "4.500", category_id: "", description: "" }));
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      name: "Papas",
      price: 450_000,
      category_id: null,
      description: null,
      compare_at_price: null,
      is_published: false,
      is_available: false,
      is_featured: false,
    });
  });

  it("interpreta las casillas tildadas", () => {
    const parsed = productFormSchema.safeParse(
      form({ name: "Papas", price: "4500", is_published: "on", is_available: "on", is_featured: "on" }),
    );
    expect(parsed.data).toMatchObject({ is_published: true, is_available: true, is_featured: true });
  });

  it("rechaza un precio anterior menor y lo explica en castellano", () => {
    const parsed = productFormSchema.safeParse(form({ name: "Papas", price: "4.500", compare_at_price: "3.000" }));
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(firstError(parsed.error)).toBe("El precio anterior tiene que ser mayor que el precio actual.");
  });

  it("rechaza precios inválidos y nombres vacíos", () => {
    const badPrice = productFormSchema.safeParse(form({ name: "Papas", price: "cuatro mil" }));
    expect(badPrice.success).toBe(false);
    if (!badPrice.success) expect(firstError(badPrice.error)).toMatch(/^Precio: ingresá un monto válido/);

    const noName = productFormSchema.safeParse(form({ name: "   ", price: "100" }));
    expect(noName.success).toBe(false);
    if (!noName.success) expect(firstError(noName.error)).toBe("El nombre es obligatorio.");
  });

  it("rechaza una categoría que no es un UUID", () => {
    expect(productFormSchema.safeParse(form({ name: "Papas", price: "100", category_id: "../../x" })).success).toBe(false);
  });

  it("ignora campos extra que pudiera mandar alguien (por ejemplo tenant_id)", () => {
    const parsed = productFormSchema.safeParse(
      form({ name: "Papas", price: "100", tenant_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
    );
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("tenant_id");
  });
});

describe("categoryFormSchema", () => {
  it("acepta una categoría oculta (casilla sin tildar)", () => {
    const parsed = categoryFormSchema.safeParse(form({ name: "Postres", description: "" }));
    expect(parsed.data).toEqual({ name: "Postres", description: null, is_visible: false });
  });
});

describe("etiquetas y características del producto", () => {
  function data(extra: [string, string][]) {
    const fd = new FormData();
    fd.append("name", "Vestido Mar");
    fd.append("price", "42.000");
    for (const [k, v] of extra) fd.append(k, v);
    return fd;
  }

  it("productFormFromData junta las etiquetas tildadas y las filas con datos", () => {
    const raw = productFormFromData(
      data([
        ["tags", "nuevo"],
        ["tags", "ultimas_unidades"],
        ["spec_label", " Material "],
        ["spec_value", "Lino"],
        ["spec_label", ""],
        ["spec_value", ""],
        ["spec_label", "Talle"],
        ["spec_value", "Único"],
      ]),
    );
    const parsed = productFormSchema.parse(raw);
    expect(parsed.tags).toEqual(["nuevo", "ultimas_unidades"]);
    expect(parsed.specs).toEqual([
      { label: "Material", value: "Lino" },
      { label: "Talle", value: "Único" },
    ]);
  });

  it("sin etiquetas ni características quedan vacías", () => {
    const parsed = productFormSchema.parse(productFormFromData(data([])));
    expect(parsed.tags).toEqual([]);
    expect(parsed.specs).toEqual([]);
  });

  it("rechaza más de 3 etiquetas", () => {
    const tags: [string, string][] = ["nuevo", "vegano", "picante", "sin_tacc"].map((t) => ["tags", t]);
    const result = productFormSchema.safeParse(productFormFromData(data(tags)));
    expect(result.success).toBe(false);
    expect(firstError(result.error!)).toBe("Elegí hasta 3 etiquetas.");
  });

  it("rechaza una etiqueta fuera de la lista", () => {
    expect(productFormSchema.safeParse(productFormFromData(data([["tags", "oferta"]]))).success).toBe(false);
  });

  it("pide el valor de una característica que tiene nombre", () => {
    const result = productFormSchema.safeParse(productFormFromData(data([["spec_label", "Material"], ["spec_value", " "]])));
    expect(result.success).toBe(false);
    expect(firstError(result.error!)).toBe("Completá el valor de «Material».");
  });

  it("rechaza más de 8 características", () => {
    const rows: [string, string][] = Array.from({ length: 9 }, (_, i) => [
      ["spec_label", `L${i}`],
      ["spec_value", "v"],
    ]).flat() as [string, string][];
    expect(productFormSchema.safeParse(productFormFromData(data(rows))).success).toBe(false);
  });
});

describe("formularios de opciones (parte 3)", () => {
  it("grupo: una sola o varias con máximo", () => {
    expect(optionGroupSchema.parse({ name: " Talle ", required: "on", choice: "one" })).toEqual({ name: "Talle", required: true, max_choices: 1 });
    expect(optionGroupSchema.parse({ name: "Extras", choice: "many", max_choices: "3" })).toEqual({ name: "Extras", required: false, max_choices: 3 });
  });
  it("grupo: pide nombre y un máximo válido", () => {
    expect(optionGroupSchema.safeParse({ name: "", choice: "one" }).success).toBe(false);
    expect(optionGroupSchema.safeParse({ name: "Extras", choice: "many", max_choices: "1" }).success).toBe(false);
    expect(optionGroupSchema.safeParse({ name: "x".repeat(41), choice: "one" }).success).toBe(false);
  });
  it("opción: precio adicional en pesos, vacío = 0", () => {
    expect(optionSchema.parse({ name: "Doble", price_delta: "1.500" })).toEqual({ name: "Doble", price_delta: 150000 });
    expect(optionSchema.parse({ name: "Simple", price_delta: "" })).toEqual({ name: "Simple", price_delta: 0 });
    expect(optionSchema.safeParse({ name: "Mal", price_delta: "abc" }).success).toBe(false);
  });
});

describe("productQuickSchema (hoja de edición rápida)", () => {
  it("toma solo los seis campos de la hoja e ignora el resto", () => {
    const parsed = productQuickSchema.safeParse(
      form({ name: "Papas", price: "4.500", compare_at_price: "", category_id: "", is_available: "on", description: "x", tags: "vegano" }),
    );
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({
      name: "Papas",
      price: 450_000,
      compare_at_price: null,
      category_id: null,
      is_published: false,
      is_available: true,
    });
  });

  it("rechaza un precio anterior menor que el precio", () => {
    const parsed = productQuickSchema.safeParse(form({ name: "Papas", price: "4.500", compare_at_price: "3.000" }));
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(firstError(parsed.error)).toBe("El precio anterior tiene que ser mayor que el precio actual.");
  });
});
