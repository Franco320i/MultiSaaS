import type { Instrumentation } from "next";
import { sentryEnabled, sentryOptions } from "@/lib/observability/sentry-options";

// Errores del servidor → Sentry (etapa 10d). Sin DSN (local, CI, E2E) no hace nada.
export async function register() {
  if (!sentryEnabled) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init(sentryOptions);
  }
}

// Next llama a esto con cada error de una página, Server Action, Route Handler o del proxy.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!sentryEnabled) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
  await Sentry.flush(2000);
};
