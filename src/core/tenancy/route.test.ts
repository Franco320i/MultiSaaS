import { describe, expect, it } from "vitest";
import { classifyHost, normalizeHost } from "./host";
import { decideRoute } from "./route";
import { isValidSlug } from "./slug";

const PROD = "tuapp.com.ar";
const LOCAL = "localhost";

describe("normalizeHost", () => {
  it.each([
    ["alfa.localhost:3000", "alfa.localhost"],
    ["ALFA.TuApp.com.ar", "alfa.tuapp.com.ar"],
    ["alfa.tuapp.com.ar.", "alfa.tuapp.com.ar"],
    ["  app.localhost  ", "app.localhost"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeHost(raw)).toBe(expected);
  });

  it.each([
    [null],
    [""],
    ["[::1]:3000"],
    ["alfa.localhost:abc"],
    ["al fa.localhost"],
    ["alfa..localhost"],
    ["-alfa.localhost"],
    ["alfa_beta.localhost"],
    ["a".repeat(254)],
  ])("rechaza %s", (raw) => {
    expect(normalizeHost(raw)).toBeNull();
  });
});

describe("isValidSlug", () => {
  it.each(["alfa", "burger-alfa", "a1b", "a".repeat(40)])("acepta %s", (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each(["ab", "a".repeat(41), "-alfa", "alfa-", "Alfa", "xn--alfa", "app", "admin", "api", "www"])(
    "rechaza %s",
    (slug) => {
      expect(isValidSlug(slug)).toBe(false);
    },
  );
});

describe("classifyHost", () => {
  it.each([
    [PROD, { kind: "marketing" }],
    [`www.${PROD}`, { kind: "redirect-to-root" }],
    [`app.${PROD}`, { kind: "panel" }],
    [`admin.${PROD}`, { kind: "admin" }],
    [`alfa.${PROD}`, { kind: "storefront", host: `alfa.${PROD}` }],
    [`x.alfa.${PROD}`, { kind: "invalid" }],
    [`api.${PROD}`, { kind: "invalid" }],
    [`ab.${PROD}`, { kind: "invalid" }],
    ["pedidos.burger.com.ar", { kind: "storefront", host: "pedidos.burger.com.ar" }],
  ])("producción: %s", (host, expected) => {
    expect(classifyHost(host, PROD)).toEqual(expected);
  });

  it("local usa el mismo esquema con localhost", () => {
    expect(classifyHost("localhost", LOCAL)).toEqual({ kind: "marketing" });
    expect(classifyHost("app.localhost", LOCAL)).toEqual({ kind: "panel" });
    expect(classifyHost("alfa.localhost", LOCAL)).toEqual({ kind: "storefront", host: "alfa.localhost" });
  });

  it("un dominio que solo termina parecido no es un subdominio de la plataforma", () => {
    expect(classifyHost("alfatuapp.com.ar", PROD)).toEqual({ kind: "storefront", host: "alfatuapp.com.ar" });
  });
});

describe("decideRoute", () => {
  const route = (rawHost: string | null, pathname: string, rootDomain = LOCAL) =>
    decideRoute({ rawHost, pathname, rootDomain });

  it("el catálogo se reescribe a /sites/{host}", () => {
    expect(route("alfa.localhost:3000", "/")).toEqual({
      action: "rewrite",
      pathname: "/sites/alfa.localhost",
      private: false,
    });
    expect(route("alfa.localhost:3000", "/productos/x")).toEqual({
      action: "rewrite",
      pathname: "/sites/alfa.localhost/productos/x",
      private: false,
    });
  });

  it("panel y admin se reescriben y se marcan como privados", () => {
    expect(route("app.localhost:3000", "/")).toEqual({ action: "rewrite", pathname: "/panel", private: true });
    expect(route("app.localhost:3000", "/alfa/productos")).toEqual({
      action: "rewrite",
      pathname: "/panel/alfa/productos",
      private: true,
    });
    expect(route("admin.localhost:3000", "/")).toEqual({ action: "rewrite", pathname: "/admin", private: true });
  });

  it("el dominio raíz sirve marketing sin reescribir", () => {
    expect(route("localhost:3000", "/")).toEqual({ action: "next" });
  });

  it("www redirige al dominio raíz", () => {
    expect(route(`www.${PROD}`, "/", PROD)).toEqual({ action: "redirect-to-root" });
  });

  it.each([
    "/sites/beta.localhost",
    "/sites",
    "/panel",
    "/panel/beta",
    "/admin",
    "/Sites/beta.localhost",
    "/%73ites/beta.localhost",
    "//sites/beta.localhost",
    "/%2Fsites/beta.localhost",
  ])("las rutas internas pedidas directo dan 404 desde cualquier host: %s", (pathname) => {
    for (const host of ["localhost", "alfa.localhost", "app.localhost", "admin.localhost"]) {
      expect(route(host, pathname)).toEqual({ action: "not-found" });
    }
  });

  it("rutas que solo empiezan parecido no se bloquean", () => {
    expect(route("localhost", "/sitesmap")).toEqual({ action: "next" });
    expect(route("localhost", "/administracion")).toEqual({ action: "next" });
  });

  it("hosts inválidos o reservados dan 404 y un Host ilegible da 400", () => {
    expect(route("x.alfa.localhost", "/")).toEqual({ action: "not-found" });
    expect(route("api.localhost", "/")).toEqual({ action: "not-found" });
    expect(route(null, "/")).toEqual({ action: "bad-request" });
    expect(route("alfa.localhost", "/%E0%A4%A")).toEqual({ action: "bad-request" });
  });

  it("las rutas de API no se reescriben", () => {
    expect(route("alfa.localhost", "/api/orders")).toEqual({ action: "next" });
  });
});
