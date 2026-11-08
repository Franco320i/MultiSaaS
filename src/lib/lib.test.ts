import { describe, expect, it } from "vitest";
import { centsToInput, formatCents, parseAmountToCents } from "./money";
import { slugify, slugWithSuffix } from "./slugify";

describe("parseAmountToCents", () => {
  it.each([
    ["18000", 1_800_000],
    ["18.000", 1_800_000],
    ["1.250.000", 125_000_000],
    ["18.000,50", 1_800_050],
    ["18000,5", 1_800_050],
    ["18000.50", 1_800_050],
    ["$ 18.000", 1_800_000],
    ["0", 0],
    ["0,99", 99],
  ])("%s → %i centavos", (input, cents) => {
    expect(parseAmountToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "-100", "18,000,00", "18.00.0", "1,234", "18.0000", "1e5", "999999999999"])(
    "rechaza %s",
    (input) => {
      // "1,234": tres decimales no es un monto válido (no se redondea en silencio).
      expect(parseAmountToCents(input)).toBeNull();
    },
  );
});

describe("formatCents y centsToInput", () => {
  it("formatea en pesos argentinos", () => {
    expect(formatCents(1_800_000).replace(/\s/g, " ")).toBe("$ 18.000");
    expect(formatCents(1_800_050).replace(/\s/g, " ")).toBe("$ 18.000,50");
  });

  it("precarga el formulario en el mismo formato que acepta", () => {
    for (const cents of [0, 99, 1_800_000, 1_800_050, 125_000_000]) {
      expect(parseAmountToCents(centsToInput(cents))).toBe(cents);
    }
  });
});

describe("slugify", () => {
  it.each([
    ["Hamburguesa Doble", "hamburguesa-doble"],
    ["Ñandú & Café", "nandu-cafe"],
    ["  --Promo 2x1!!  ", "promo-2x1"],
    ["", "item"],
    ["¡¡¡", "item"],
  ])("%s → %s", (input, slug) => {
    expect(slugify(input)).toBe(slug);
  });

  it("respeta el largo máximo sin terminar en guion", () => {
    const slug = slugify("palabra ".repeat(30), 20);
    expect(slug.length).toBeLessThanOrEqual(20);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("numera choques respetando el largo máximo", () => {
    expect(slugWithSuffix("remera", 1)).toBe("remera");
    expect(slugWithSuffix("remera", 2)).toBe("remera-2");
    expect(slugWithSuffix("a".repeat(80), 12, 80)).toBe(`${"a".repeat(77)}-12`);
  });
});
