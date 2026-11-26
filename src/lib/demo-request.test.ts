import { describe, expect, it } from "vitest";
import { demoRequestUrl, passwordHelpUrl } from "./demo-request";

describe("demoRequestUrl", () => {
  it("abre el WhatsApp de la plataforma con el pedido de demo escrito", () => {
    const url = new URL(demoRequestUrl("+5492954123456")!);
    expect(url.origin + url.pathname).toBe("https://wa.me/5492954123456");
    expect(url.searchParams.get("text")).toBe("Hola, quiero una demo de Vidri para mi local.");
  });

  it("sin número no hay link (la página no muestra un botón que no anda)", () => {
    expect(demoRequestUrl(undefined)).toBeNull();
  });
});

describe("passwordHelpUrl", () => {
  it("abre el WhatsApp de la plataforma para pedir una contraseña nueva", () => {
    const url = new URL(passwordHelpUrl("+5492954123456")!);
    expect(url.pathname).toBe("/5492954123456");
    expect(url.searchParams.get("text")).toBe("Hola, me olvidé la contraseña de mi panel de Vidri.");
    expect(passwordHelpUrl(undefined)).toBeNull();
  });
});
