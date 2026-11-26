import { describe, expect, it } from "vitest";
import { BRAND_PALETTE } from "./brand-palette";
import { brandShades, contrastRatio, mixHex } from "./color";

describe("mixHex", () => {
  it("mezcla dos colores en la proporción del primero", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#c2410c", "#ffffff", 1)).toBe("#c2410c");
    expect(mixHex("#c2410c", "#ffffff", 0)).toBe("#ffffff");
  });
});

describe("brandShades", () => {
  for (const color of BRAND_PALETTE) {
    it(`${color}: todo se lee con contraste AA`, () => {
      const s = brandShades(color);
      expect(contrastRatio(color, s.tint)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(color, s.page)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(color, "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio("#ffffff", s.brand2)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("el fondo está apenas teñido y el tinte es más claro que el color", () => {
    const s = brandShades("#c2410c");
    expect(s.page).not.toBe("#fbfbf9");
    expect(contrastRatio(s.tint, "#ffffff")).toBeLessThan(contrastRatio("#c2410c", "#ffffff"));
  });
});
