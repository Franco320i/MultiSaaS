import { describe, expect, it } from "vitest";
import { statValueSize } from "./stat-value";

describe("statValueSize", () => {
  it("los números cortos van grandes", () => {
    expect(statValueSize("48")).toBe("large");
    expect(statValueSize("$ 486.000")).toBe("large");
  });
  it("los montos de 7 cifras o más bajan un tamaño para entrar en una celda angosta", () => {
    expect(statValueSize("$ 1.234.567")).toBe("medium");
  });
  it("los nombres (el más pedido) van chicos", () => {
    expect(statValueSize("Clásica doble cheddar", "text")).toBe("small");
  });
});
