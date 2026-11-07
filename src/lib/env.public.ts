import { z } from "zod";

/**
 * Variables públicas (llegan al navegador). Next.js solo las incluye en el bundle
 * del cliente si se leen con el nombre literal `process.env.NEXT_PUBLIC_...`.
 * Acá NUNCA va nada secreto: la clave publicable solo permite lo que deja RLS.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    .refine((key) => !key.startsWith("sb_secret_"), "Se cargó una clave SECRETA como publicable"),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
