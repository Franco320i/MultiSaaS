import { describe, expect, it } from "vitest";
import { describeOrderStats, parseOrderStats } from "./stats";

const base = {
  month: 11,
  month_orders: 42,
  month_total: 38_000_000,
  prev_orders: 35,
  prev_total: 32_200_000,
  top_product: { name: "Doble cheddar", units: 61 },
  new_orders: 3,
};

describe("parseOrderStats", () => {
  it("lee lo que devuelve la base", () => {
    expect(parseOrderStats(base)).toEqual({
      month: 11,
      monthOrders: 42,
      monthTotal: 38_000_000,
      prevOrders: 35,
      prevTotal: 32_200_000,
      topProduct: { name: "Doble cheddar", units: 61 },
      newOrders: 3,
    });
  });

  it("acepta un mes sin producto destacado", () => {
    expect(parseOrderStats({ ...base, top_product: null })?.topProduct).toBeNull();
  });

  it("ante algo raro devuelve null en vez de romper el panel", () => {
    expect(parseOrderStats({ nada: true })).toBeNull();
    expect(parseOrderStats(null)).toBeNull();
  });
});

describe("describeOrderStats", () => {
  it("arma el título, la comparación y el más pedido", () => {
    const d = describeOrderStats(parseOrderStats(base)!);
    expect(d.monthLabel).toBe("Noviembre");
    expect(d.ordersLabel).toBe("42 pedidos");
    expect(d.amountLabel).toBe("$ 380.000"); // formatCents usa espacio duro
    expect(d.change).toEqual({ direction: "up", text: "+18% que en el mismo período de octubre" });
    expect(d.top).toBe("El más pedido: Doble cheddar");
    expect(d.empty).toBe(false);
  });

  it("si baja, muestra el signo menos sin alarmar", () => {
    const d = describeOrderStats(parseOrderStats({ ...base, month_total: 28_336_000 })!);
    expect(d.change).toEqual({ direction: "down", text: "−12% que en el mismo período de octubre" });
  });

  it("si es igual, lo dice", () => {
    const d = describeOrderStats(parseOrderStats({ ...base, month_total: 32_300_000 })!);
    expect(d.change).toEqual({ direction: "same", text: "Igual que en el mismo período de octubre" });
  });

  it("sin pedidos el mes anterior no compara", () => {
    const d = describeOrderStats(parseOrderStats({ ...base, prev_orders: 0, prev_total: 0 })!);
    expect(d.change).toBeNull();
  });

  it("en enero compara con diciembre", () => {
    const d = describeOrderStats(parseOrderStats({ ...base, month: 1 })!);
    expect(d.monthLabel).toBe("Enero");
    expect(d.change?.text).toContain("de diciembre");
  });

  it("usa singular con un pedido", () => {
    expect(describeOrderStats(parseOrderStats({ ...base, month_orders: 1 })!).ordersLabel).toBe("1 pedido");
  });

  it("sin pedidos este mes queda vacío, con el texto para compartir el catálogo", () => {
    const d = describeOrderStats(
      parseOrderStats({ ...base, month_orders: 0, month_total: 0, top_product: null })!,
    );
    expect(d.empty).toBe(true);
    expect(d.emptyText).toBe("Todavía no recibiste pedidos en noviembre. Compartí el link de tu catálogo para recibir el primero.");
    expect(d.top).toBeNull();
  });
});
