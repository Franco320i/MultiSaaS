import { describe, expect, test } from "vitest";
import { officialDemoUrl } from "./demo-rule";

const OFFICIAL = "11111111-1111-4111-8111-111111111111";
const URL = "https://demo.vidri.ar";

describe("officialDemoUrl", () => {
  test("muestra el ejemplo si el comercio publicado es el configurado", () => {
    expect(officialDemoUrl({ available: true, tenant_id: OFFICIAL }, OFFICIAL, URL)).toBe(URL);
  });
  test("no anuncia a otro comercio que se quedó con el mismo nombre", () => {
    expect(officialDemoUrl({ available: true, tenant_id: "22222222-2222-4222-8222-222222222222" }, OFFICIAL, URL)).toBeNull();
  });
  test("sin comercio configurado no hay ejemplo", () => {
    expect(officialDemoUrl({ available: true, tenant_id: OFFICIAL }, undefined, URL)).toBeNull();
  });
  test("comercio inexistente o no publicado no se anuncia", () => {
    expect(officialDemoUrl(null, OFFICIAL, URL)).toBeNull();
    expect(officialDemoUrl({ available: false }, OFFICIAL, URL)).toBeNull();
  });
});
