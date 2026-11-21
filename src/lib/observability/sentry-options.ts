import { z } from "zod";
import { scrubEvent } from "./scrub";

/**
 * Opciones comunes de Sentry para el servidor y el navegador (etapa 10d).
 *
 * - Sin NEXT_PUBLIC_SENTRY_DSN no se manda nada (local, CI y E2E). El DSN no es secreto:
 *   solo permite enviar errores a ese proyecto, por eso puede ir al navegador.
 * - NEXT_PUBLIC_SENTRY_ENVIRONMENT separa staging y producción dentro del mismo proyecto.
 * - Solo errores: sin trazas de rendimiento ni grabación de sesiones (cuota gratis y privacidad).
 * - sendDefaultPii: false y scrubEvent antes de enviar: nada de datos de clientes.
 *
 * Next solo mete en el navegador las variables leídas con el nombre literal.
 */
const schema = z.object({
  dsn: z.url().optional(),
  environment: z.string().trim().min(1).max(32).optional(),
});

const parsed = schema.safeParse({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || undefined,
});

const config = parsed.success ? parsed.data : {};

export const sentryEnabled = Boolean(config.dsn);

export const sentryOptions = {
  dsn: config.dsn,
  environment: config.environment ?? "local",
  enabled: sentryEnabled,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: scrubEvent,
};
