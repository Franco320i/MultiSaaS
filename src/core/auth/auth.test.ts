import { describe, expect, it } from "vitest";
import { can, isTenantRole } from "./permissions";
import { loginPath, safeCallbackPath, safeRedirectPath } from "./redirect";

describe("can", () => {
  it("el dueño puede todo dentro de su comercio", () => {
    for (const permission of [
      "panel.view", "catalog.write", "orders.manage", "settings.write",
      "catalog.publish", "members.manage", "billing.view",
    ] as const) {
      expect(can("owner", permission)).toBe(true);
    }
  });

  it("el staff gestiona catálogo y pedidos, nada más (diseño, sección 6)", () => {
    expect(can("staff", "panel.view")).toBe(true);
    expect(can("staff", "catalog.write")).toBe(true);
    expect(can("staff", "orders.manage")).toBe(true);
    expect(can("staff", "settings.write")).toBe(false);
    expect(can("staff", "catalog.publish")).toBe(false);
    expect(can("staff", "members.manage")).toBe(false);
    expect(can("staff", "billing.view")).toBe(false);
  });

  it("solo reconoce los roles conocidos", () => {
    expect(isTenantRole("owner")).toBe(true);
    expect(isTenantRole("staff")).toBe(true);
    expect(isTenantRole("superadmin")).toBe(false);
    expect(isTenantRole(null)).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it.each(["/", "/alfa", "/alfa/productos?x=1"])("acepta rutas internas: %s", (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  it.each([
    "https://evil.com", "//evil.com", "/\\evil.com", "evil.com", "", null, undefined, 42,
    "/auth/login", "/auth", "/a\nb", "/".padEnd(600, "a"),
  ])("rechaza destinos externos o raros: %s", (path) => {
    expect(safeRedirectPath(path)).toBe("/");
  });

  it("el callback de correo puede volver a 'nueva contraseña' y a nada más de /auth", () => {
    expect(safeCallbackPath("/auth/nueva-contrasena")).toBe("/auth/nueva-contrasena");
    expect(safeCallbackPath("/auth/login")).toBe("/");
    expect(safeCallbackPath("/auth/nueva-contrasena/../login")).toBe("/");
    expect(safeCallbackPath("//evil.com")).toBe("/");
    expect(safeCallbackPath("/alfa")).toBe("/alfa");
  });

  it("arma el enlace al login con el destino codificado", () => {
    expect(loginPath("/")).toBe("/auth/login");
    expect(loginPath("/alfa")).toBe("/auth/login?next=%2Falfa");
    expect(loginPath("//evil.com")).toBe("/auth/login");
  });
});
