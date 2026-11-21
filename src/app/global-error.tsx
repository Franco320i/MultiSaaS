"use client";

import { useEffect } from "react";
import { sentryEnabled } from "@/lib/observability/sentry-options";

/**
 * Último recurso cuando falla todo el layout. Reemplaza al documento entero, así que no
 * usa los estilos de la app. Avisa a Sentry (si está configurado) y ofrece reintentar.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (!sentryEnabled) return;
    import("@sentry/nextjs")
      .then((Sentry) => Sentry.captureException(error))
      .catch(() => {});
  }, [error]);

  return (
    <html lang="es-AR">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "48px 16px", maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24 }}>Algo salió mal</h1>
        <p>No pudimos mostrar esta página. Probá de nuevo en unos segundos.</p>
        <button type="button" onClick={reset} style={{ marginTop: 16, minHeight: 44, padding: "0 20px", fontSize: 16 }}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
