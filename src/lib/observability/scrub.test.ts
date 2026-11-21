import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { scrubEvent } from "./scrub";

/** Diseño, sección 12.9: Sentry etiqueta el comercio y borra teléfonos, direcciones y cuerpos. */

function event(partial: Partial<ErrorEvent>): ErrorEvent {
  return { type: undefined, ...partial } as ErrorEvent;
}

describe("scrubEvent", () => {
  it("borra el cuerpo, las cookies, la query y los headers del pedido, y deja el host como etiqueta", () => {
    const out = scrubEvent(
      event({
        request: {
          url: "https://alfa.vidri.ar/api/orders?tel=2954000001",
          method: "POST",
          data: { name: "Juana", phone: "+5492954000001", address: "Mitre 123" },
          cookies: { "sb-access-token": "x" },
          query_string: "tel=2954000001",
          headers: { host: "alfa.vidri.ar", cookie: "sb=1", "x-forwarded-for": "1.2.3.4", "user-agent": "Mozilla" },
        },
      }),
    );
    expect(out.request).toEqual({ url: "https://alfa.vidri.ar/api/orders", method: "POST" });
    expect(out.tags).toEqual({ host: "alfa.vidri.ar" });
  });

  it("saca la query de la ruta que agrega Next y las variables locales de cada línea", () => {
    const out = scrubEvent(
      event({
        contexts: { nextjs: { request_path: "/api/orders?tel=2954000001", route_type: "route" } },
        exception: {
          values: [{ type: "Error", value: "x", stacktrace: { frames: [{ function: "f", vars: { phone: "+5492954000001" } }] } }],
        },
      }),
    );
    expect(out.contexts?.nextjs).toEqual({ request_path: "/api/orders", route_type: "route" });
    expect(out.exception?.values?.[0]?.stacktrace?.frames).toEqual([{ function: "f" }]);
  });

  it("en el navegador (sin headers) toma el host de la URL", () => {
    const out = scrubEvent(event({ request: { url: "https://alfa.vidri.ar/?tel=2954000001" } }));
    expect(out.request).toEqual({ url: "https://alfa.vidri.ar/" });
    expect(out.tags).toEqual({ host: "alfa.vidri.ar" });
  });

  it("no manda el usuario ni la IP", () => {
    const out = scrubEvent(event({ user: { id: "u1", email: "a@b.com", ip_address: "1.2.3.4" } }));
    expect(out.user).toBeUndefined();
  });

  it("tacha teléfonos y correos en el mensaje y en los errores", () => {
    const out = scrubEvent(
      event({
        message: "Falló el pedido de +54 9 2954 000001 (juana@example.com)",
        exception: { values: [{ type: "Error", value: "Teléfono 2954000001 inválido" }] },
      }),
    );
    expect(out.message).toBe("Falló el pedido de [tel] ([correo])");
    expect(out.exception?.values?.[0]?.value).toBe("Teléfono [tel] inválido");
  });

  it("no tacha números cortos como cantidades o códigos de estado", () => {
    const out = scrubEvent(event({ message: "Pedido #12 con 3 productos: HTTP 500" }));
    expect(out.message).toBe("Pedido #12 con 3 productos: HTTP 500");
  });

  it("saca datos extra, las migas de consola (pueden tener direcciones) y la query de las URLs", () => {
    const out = scrubEvent(
      event({
        extra: { body: "Mitre 123" },
        breadcrumbs: [
          { category: "fetch", data: { url: "https://x.supabase.co/rest/v1/orders?phone=eq.2954000001", method: "GET" } },
          { category: "console", message: "dirección Mitre 123, tel 2954000001" },
        ],
      }),
    );
    expect(out.extra).toBeUndefined();
    expect(out.breadcrumbs).toEqual([
      { category: "fetch", data: { url: "https://x.supabase.co/rest/v1/orders", method: "GET" } },
    ]);
  });
});
