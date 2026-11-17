import { describe, expect, it } from "vitest";
import { MAX_IMPORT_ROWS, parseSpreadsheet } from "./import";

describe("parseSpreadsheet", () => {
  it("lee celdas pegadas de una planilla (tabulaciones) y saltea el encabezado", () => {
    const text = "Categoría\tNombre\tDescripción\tPrecio\r\nHamburguesas\tHamburguesa doble\tDoble carne\t$ 9.000\nBebidas\tGaseosa\t\t2000,50\n\n";
    const parsed = parseSpreadsheet(text);
    expect(parsed.skippedHeader).toBe(true);
    expect(parsed.rows).toEqual([
      { line: 2, category: "Hamburguesas", name: "Hamburguesa doble", description: "Doble carne", price: 900000, errors: [] },
      { line: 3, category: "Bebidas", name: "Gaseosa", description: null, price: 200050, errors: [] },
    ]);
  });

  it("acepta punto y coma (CSV en español) y filas sin categoría", () => {
    const parsed = parseSpreadsheet(';Gorra;;9.000');
    expect(parsed.rows[0]).toMatchObject({ category: null, name: "Gorra", price: 900000, errors: [] });
  });

  it("marca errores por fila sin cortar las demás", () => {
    const parsed = parseSpreadsheet("Bebidas\t\t\t100\nBebidas\tAgua\t\tmucho\nBebidas\tSoda\t\t");
    expect(parsed.rows.map((r) => r.errors)).toEqual([
      ["Falta el nombre."],
      ['El precio "mucho" no es válido: escribí, por ejemplo, 18.000.'],
      ["Falta el precio."],
    ]);
  });

  it("corta en el máximo de filas y lo avisa", () => {
    const text = Array.from({ length: MAX_IMPORT_ROWS + 5 }, (_, i) => `Cat\tProducto ${i}\t\t100`).join("\n");
    const parsed = parseSpreadsheet(text);
    expect(parsed.rows).toHaveLength(MAX_IMPORT_ROWS);
    expect(parsed.tooMany).toBe(true);
  });
});
