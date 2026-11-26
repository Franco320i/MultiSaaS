import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Contraste WCAG entre dos colores #rrggbb. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const whatsappValues = [...css.matchAll(/--whatsapp:\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1]);

describe("token whatsapp", () => {
  it("está definido en claro y en oscuro", () => {
    expect(whatsappValues.length).toBeGreaterThanOrEqual(2);
  });

  it("lleva texto blanco con contraste AA (4,5:1) en todos los modos", () => {
    for (const value of whatsappValues) expect(contrast(value, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});
