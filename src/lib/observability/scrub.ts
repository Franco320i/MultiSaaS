import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

/**
 * Filtro de privacidad de Sentry (diseño, sección 12.9): antes de mandar un error se borra
 * todo lo que puede traer datos de los clientes de un comercio (nombre, teléfono, dirección,
 * notas del pedido) o la sesión. Queda qué falló, dónde y en qué comercio (el host).
 * Lo usan la configuración del servidor y la del navegador (`beforeSend`).
 */

// 7 o más dígitos, con espacios, guiones o un + adelante: teléfonos argentinos con o sin 54/9.
const PHONE = /\+?\d(?:[\s-]?\d){6,}/g;
const EMAIL = /[^\s@()<>"']+@[^\s@()<>"']+\.[a-z]{2,}/gi;

function redact(text: string | undefined): string | undefined {
  return text?.replace(EMAIL, "[correo]").replace(PHONE, "[tel]");
}

function withoutQuery(url: unknown): unknown {
  return typeof url === "string" ? url.split(/[?#]/)[0] : url;
}

function hostOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host || undefined;
  } catch {
    return undefined;
  }
}

function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  const out: Breadcrumb = { ...crumb, message: redact(crumb.message) };
  if (out.message === undefined) delete out.message;
  if (crumb.data) {
    out.data = { ...crumb.data };
    for (const key of ["url", "to", "from"]) if (key in out.data) out.data[key] = withoutQuery(out.data[key]);
  }
  return out;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const out: ErrorEvent = { ...event };

  if (event.request) {
    const headers = event.request.headers ?? {};
    const host = headers.host ?? headers.Host ?? hostOf(event.request.url);
    out.request = {};
    if (event.request.url) out.request.url = withoutQuery(event.request.url) as string;
    if (event.request.method) out.request.method = event.request.method;
    if (host) out.tags = { ...event.tags, host };
  }

  delete out.user;
  delete out.extra;

  const nextjs = event.contexts?.nextjs;
  if (nextjs && "request_path" in nextjs) {
    out.contexts = { ...event.contexts, nextjs: { ...nextjs, request_path: withoutQuery(nextjs.request_path) } };
  }

  if (event.message !== undefined) out.message = redact(event.message);
  if (event.exception?.values) {
    out.exception = {
      ...event.exception,
      values: event.exception.values.map((value) => {
        const scrubbed = { ...value, value: redact(value.value) };
        if (value.stacktrace?.frames) {
          // Variables locales de cada línea: pueden tener el cuerpo del pedido.
          scrubbed.stacktrace = {
            ...value.stacktrace,
            frames: value.stacktrace.frames.map((frame) => {
              const copy = { ...frame };
              delete copy.vars;
              return copy;
            }),
          };
        }
        return scrubbed;
      }),
    };
  }
  if (event.breadcrumbs) {
    out.breadcrumbs = event.breadcrumbs.filter((crumb) => crumb.category !== "console").map(scrubBreadcrumb);
  }

  return out;
}
