import { describe, expect, test } from "vitest";
import { planHighlights, recommendedPlanId, type PublicPlan } from "./plan-display";

const base: PublicPlan = { id: "base", name: "Base", priceCents: 2490000, maxProducts: 150, maxImagesPerProduct: 3, sort: 1 };
const pro: PublicPlan = { id: "pro", name: "Pro", priceCents: 3990000, maxProducts: null, maxImagesPerProduct: 8, sort: 2 };

describe("planHighlights", () => {
  test("con límite de productos", () => {
    expect(planHighlights(base)).toEqual(["Hasta 150 productos", "Hasta 3 fotos por producto"]);
  });
  test("sin límite de productos", () => {
    expect(planHighlights(pro)).toEqual(["Productos ilimitados", "Hasta 8 fotos por producto"]);
  });
  test("con una sola foto", () => {
    expect(planHighlights({ ...base, maxImagesPerProduct: 1 })[1]).toBe("1 foto por producto");
  });
  test("miles con punto", () => {
    expect(planHighlights({ ...base, maxProducts: 1000 })[0]).toBe("Hasta 1.000 productos");
  });
});

describe("recommendedPlanId", () => {
  test("elige el de mayor sort", () => {
    expect(recommendedPlanId([pro, base])).toBe("pro");
  });
  test("sin elección con un solo plan o ninguno", () => {
    expect(recommendedPlanId([base])).toBeNull();
    expect(recommendedPlanId([])).toBeNull();
  });
});
