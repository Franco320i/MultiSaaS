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
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const env: ServerEnv = serverEnvSchema.parse({
  ROOT_DOMAIN: process.env.ROOT_DOMAIN,
});
