import { describe, expect, it } from "vitest";
import { canCancel, NEXT_STEP, ORDER_STATUSES, STATUS_LABEL, STATUS_TONE, statusToast } from "./status";

describe("NEXT_STEP: Nuevo → Confirmado → Entregado", () => {
  it("de nuevo se confirma y de confirmado se entrega", () => {
    expect(NEXT_STEP.new).toEqual({ status: "confirmed", label: "Confirmar pedido" });
    expect(NEXT_STEP.confirmed).toEqual({ status: "completed", label: "Marcar como entregado" });
  });

  it("los pedidos viejos en preparación o listos también pasan directo a entregado", () => {
    expect(NEXT_STEP.preparing?.status).toBe("completed");
    expect(NEXT_STEP.ready?.status).toBe("completed");
  });

  it("ningún paso lleva a en preparación ni a listo", () => {
    const targets = Object.values(NEXT_STEP).map((step) => step?.status);
    expect(targets).not.toContain("preparing");
    expect(targets).not.toContain("ready");
  });

  it("se puede cancelar mientras no esté entregado ni cancelado", () => {
    expect(canCancel("new")).toBe(true);
    expect(canCancel("confirmed")).toBe(true);
    expect(canCancel("completed")).toBe(false);
    expect(canCancel("cancelled")).toBe(false);
  });
});

describe("STATUS_TONE", () => {
  it("le da a cada estado su color", () => {
    expect(STATUS_TONE).toEqual({
      new: "warning",
      confirmed: "info",
      preparing: "plum",
      ready: "accent",
      completed: "neutral",
      cancelled: "danger",
    });
  });

  it("cubre todos los estados que tienen texto", () => {
    expect(Object.keys(STATUS_TONE).sort()).toEqual(Object.keys(STATUS_LABEL).sort());
    expect(Object.keys(STATUS_TONE).sort()).toEqual([...ORDER_STATUSES].sort());
  });
});

describe("statusToast", () => {
  it("dice qué pasó con qué pedido", () => {
    expect(statusToast(3, "confirmed")).toBe("Pedido #3 confirmado");
    expect(statusToast(12, "completed")).toBe("Pedido #12 entregado");
    expect(statusToast(5, "cancelled")).toBe("Pedido #5 cancelado");
  });
});
