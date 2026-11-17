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
});

// SUPABASE_SECRET_KEY no está acá a propósito: la lee y valida solo
// src/lib/supabase/service.ts, para que la clave secreta no llegue a ningún otro módulo
// (este archivo lo importa también el proxy).

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const env: ServerEnv = serverEnvSchema.parse({
  ROOT_DOMAIN: process.env.ROOT_DOMAIN,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  IP_HASH_SALT: process.env.IP_HASH_SALT,
});
