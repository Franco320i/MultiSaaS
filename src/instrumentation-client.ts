import { sentryEnabled, sentryOptions } from "@/lib/observability/sentry-options";

// Errores del navegador → Sentry (etapa 10d). Se carga aparte y solo si hay DSN, para no
// sumarle peso a la primera carga del catálogo en el celular del comprador.
if (sentryEnabled) {
  import("@sentry/nextjs")
    .then((Sentry) => Sentry.init(sentryOptions))
    .catch(() => {
      // Si Sentry no carga (bloqueador de anuncios, red), la app sigue igual.
    });
}
