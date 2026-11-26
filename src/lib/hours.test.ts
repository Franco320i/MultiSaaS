import { describe, expect, it } from "vitest";
import { isOpenAt, localTime, summarizeHours, todayHours, type HoursRange } from "./hours";
import { contrastRatio, parseHexColor, readableTextOn } from "./color";

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3, sin horario de verano

// Martes a domingo de 19:00 a 00:30 (como Burger Alfa en el seed).
const nights: HoursRange[] = [0, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opens_at: "19:00", closes_at: "00:30" }));

/** Fecha en hora argentina: 2026-11-17 es martes. */
const ar = (isoLocal: string) => new Date(`${isoLocal}-03:00`);

describe("localTime", () => {
  it("usa la zona horaria del comercio", () => {
    expect(localTime(new Date("2026-11-18T02:15:00Z"), TZ)).toEqual({ weekday: 2, minutes: 23 * 60 + 15 });
  });
});

describe("isOpenAt", () => {
  it("abre dentro del rango", () => {
    expect(isOpenAt(nights, "auto", ar("2026-11-17T20:00"), TZ)).toBe(true);
  });
  it("sigue abierto después de medianoche con el rango del día anterior", () => {
    expect(isOpenAt(nights, "auto", ar("2026-11-18T00:15"), TZ)).toBe(true);
  });
  it("cierra a la hora de cierre", () => {
    expect(isOpenAt(nights, "auto", ar("2026-11-18T00:30"), TZ)).toBe(false);
  });
  it("lunes cerrado, y la madrugada del lunes es la cola del domingo", () => {
    expect(isOpenAt(nights, "auto", ar("2026-11-16T20:00"), TZ)).toBe(false);
    expect(isOpenAt(nights, "auto", ar("2026-11-16T00:10"), TZ)).toBe(true);
    expect(isOpenAt(nights, "auto", ar("2026-11-17T00:10"), TZ)).toBe(false);
  });
  it("rango dentro del mismo día", () => {
    const day: HoursRange[] = [{ weekday: 2, opens_at: "09:00", closes_at: "13:00" }];
    expect(isOpenAt(day, "auto", ar("2026-11-17T08:59"), TZ)).toBe(false);
    expect(isOpenAt(day, "auto", ar("2026-11-17T09:00"), TZ)).toBe(true);
    expect(isOpenAt(day, "auto", ar("2026-11-17T13:00"), TZ)).toBe(false);
  });
  it("open y closed fuerzan el estado", () => {
    expect(isOpenAt([], "open", ar("2026-11-17T04:00"), TZ)).toBe(true);
    expect(isOpenAt(nights, "closed", ar("2026-11-17T20:00"), TZ)).toBe(false);
  });
});

describe("summarizeHours", () => {
  it("agrupa días seguidos con el mismo horario", () => {
    expect(summarizeHours(nights)).toEqual(["Martes a domingo: 19:00 a 0:30"]);
  });
  it("varios rangos y días sueltos", () => {
    const hours: HoursRange[] = [
      ...[1, 2, 3, 4, 5].flatMap((weekday) => [
        { weekday, opens_at: "17:00", closes_at: "21:00" },
        { weekday, opens_at: "09:00", closes_at: "13:00" },
      ]),
      { weekday: 6, opens_at: "09:00", closes_at: "13:00" },
    ];
    expect(summarizeHours(hours)).toEqual([
      "Lunes a viernes: 9:00 a 13:00 y 17:00 a 21:00",
      "Sábado: 9:00 a 13:00",
    ]);
  });
  it("dos días seguidos se unen con y", () => {
    const hours: HoursRange[] = [5, 6].map((weekday) => ({ weekday, opens_at: "20:00", closes_at: "23:00" }));
    expect(summarizeHours(hours)).toEqual(["Viernes y sábado: 20:00 a 23:00"]);
  });
  it("sin horarios, nada", () => {
    expect(summarizeHours([])).toEqual([]);
  });
});

describe("color", () => {
  it("valida #rrggbb", () => {
    expect(parseHexColor("#C2410C")).toBe("#c2410c");
    expect(parseHexColor("red")).toBeNull();
    expect(parseHexColor("#fff")).toBeNull();
    expect(parseHexColor("#c2410c; background: url(x)")).toBeNull();
    expect(parseHexColor(42)).toBeNull();
  });
  it("elige texto legible sobre la marca", () => {
    expect(readableTextOn("#c2410c")).toBe("#ffffff");
    expect(readableTextOn("#facc15")).toBe("#1a1c18");
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
  });
});

describe("todayHours", () => {
  it("muestra el horario del día en la zona del comercio", () => {
    expect(todayHours(nights, ar("2026-11-17T22:00:00"), TZ)).toBe("19:00 a 0:30");
  });
  it("de madrugada en UTC sigue siendo el día del comercio", () => {
    // 2026-11-18 01:30 UTC = martes 17 a las 22:30 en Buenos Aires.
    expect(todayHours(nights, new Date("2026-11-18T01:30:00Z"), TZ)).toBe("19:00 a 0:30");
  });
  it("un día sin horario dice cerrado", () => {
    expect(todayHours(nights, ar("2026-11-16T12:00:00"), TZ)).toBe("Cerrado hoy");
  });
});
