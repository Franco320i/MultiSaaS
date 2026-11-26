import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, STATUS_LABEL, STATUS_TONE } from "./status";

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
