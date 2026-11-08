import { describe, expect, it } from "vitest";
import { categoryFormSchema, firstError, productFormSchema } from "./schemas";

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
