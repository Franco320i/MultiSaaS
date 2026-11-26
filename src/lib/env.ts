import { z } from "zod";

/**
 * Variables de entorno del servidor, validadas al arrancar.
 * Si falta alguna o tiene un formato inválido, la app no levanta (diseño, sección 14).
 * Se agregan nuevas variables a medida que cada etapa las necesita.
 */
const serverEnvSchema = z.object({
  /** Dominio raíz de la plataforma: "localhost", "staging.tuapp.com.ar" o "tuapp.com.ar". */
  ROOT_DOMAIN: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/,
      "ROOT_DOMAIN debe ser un nombre de host sin protocolo ni puerto",
    ),
  /** Cloudflare Turnstile (anti-bots en pedidos). */
  TURNSTILE_SECRET_KEY: z.string().min(1, "Falta TURNSTILE_SECRET_KEY"),
  /** Sal para guardar las IPs como hash en los límites de frecuencia. */
  IP_HASH_SALT: z.string().min(16, "IP_HASH_SALT debe tener al menos 16 caracteres"),
  /** Protege /api/cron/daily (Vercel Cron lo manda como Bearer). */
  CRON_SECRET: z.string().min(16, "CRON_SECRET debe tener al menos 16 caracteres"),
  /**
   * Catálogo de ejemplo de la página principal (opcional, los dos juntos). Sin ellos no
   * aparece el botón "Mirá un catálogo de ejemplo". El id ata el ejemplo a un comercio de
   * la plataforma: otro que registre el mismo slug no queda anunciado.
   */
  DEMO_CATALOG_SLUG: z.string().trim().regex(/^[a-z0-9-]{2,40}$/).optional(),
  DEMO_TENANT_ID: z.uuid().optional(),
  /**
   * WhatsApp de la plataforma para "Pedí tu demo" (opcional, con código de país: +549…).
   * Sin él no se muestran los botones de demo.
   */
  SALES_WHATSAPP: z
    .string()
    .transform((v) => v.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(/^\+[1-9][0-9]{7,14}$/, "SALES_WHATSAPP va con código de país, por ejemplo +5492954123456"))
    .optional(),
});

// SUPABASE_SECRET_KEY no está acá a propósito: la lee y valida solo
// src/lib/supabase/service.ts, para que la clave secreta no llegue a ningún otro módulo
// (este archivo lo importa también el proxy).

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const env: ServerEnv = serverEnvSchema.parse({
  ROOT_DOMAIN: process.env.ROOT_DOMAIN,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  IP_HASH_SALT: process.env.IP_HASH_SALT,
  CRON_SECRET: process.env.CRON_SECRET,
  DEMO_CATALOG_SLUG: process.env.DEMO_CATALOG_SLUG || undefined,
  DEMO_TENANT_ID: process.env.DEMO_TENANT_ID || undefined,
  SALES_WHATSAPP: process.env.SALES_WHATSAPP || undefined,
});
