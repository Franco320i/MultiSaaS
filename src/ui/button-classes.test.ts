import { describe, expect, it } from "vitest";
import { buttonClasses, type ButtonVariant } from "./button-classes";

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "soft", "text", "whatsapp", "danger"];

describe("buttonClasses", () => {
  it("por defecto es el principal: píldora verde de 44 px", () => {
    const c = buttonClasses();
    for (const cls of ["rounded-full", "min-h-11", "bg-accent", "text-accent-foreground", "disabled:opacity-50"]) {
      expect(c).toContain(cls);
    }
  });

  it("el secundario es blanco con el borde marcado", () => {
    const c = buttonClasses("secondary");
    expect(c).toContain("border-line-strong");
    expect(c).toContain("bg-surface");
  });

  it("el de WhatsApp usa su verde", () => {
    expect(buttonClasses("whatsapp")).toContain("bg-whatsapp");
  });

  it("el de borrar es texto rojo sin fondo rojo", () => {
    const c = buttonClasses("danger");
    expect(c).toContain("text-danger");
    expect(c).not.toContain("bg-danger");
  });

  it("el tamaño chico mide 36 px y no 44", () => {
    const c = buttonClasses("primary", "sm");
    expect(c).toContain("min-h-9");
    expect(c).not.toContain("min-h-11");
  });

  it("los de texto y borrar tienen relleno chico, sin el px-5 del tamaño", () => {
    for (const v of ["text", "danger"] as const) {
      expect(buttonClasses(v)).toContain("px-2");
      expect(buttonClasses(v)).not.toContain("px-5");
    }
  });

  it("el de WhatsApp se oscurece al pasar el mouse (aclararlo baja el contraste)", () => {
    const c = buttonClasses("whatsapp");
    expect(c).not.toContain("brightness-110");
    expect(c).toContain("hover:brightness-95");
  });

  it("todas las variantes tienen foco visible en verde", () => {
    for (const v of VARIANTS) expect(buttonClasses(v)).toContain("focus-visible:outline-accent");
  });

  it("las clases extra van al final", () => {
    expect(buttonClasses("primary", "md", "w-full sm:w-auto").endsWith("w-full sm:w-auto")).toBe(true);
  });
});
