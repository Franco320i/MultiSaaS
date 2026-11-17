import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { publicEnv } from "@/lib/env.public";
import type { Database } from "@/types/database";

/**
 * Cliente con la clave SECRETA de Supabase (service_role): RLS NO actúa.
 * Diseño, principio 4 y sección 12; CLAUDE.md, regla 6.
 *
 * Solo lo puede importar la lista cerrada (regla de ESLint en eslint.config.mjs):
 *   - creación de pedidos (src/modules/orders/create.ts)   ← etapa 7
 *   - panel central, alta de comercios y cron              ← etapas 8 y 9
 *
 * Con este cliente, quien lo usa es responsable de pasar SIEMPRE el tenantId resuelto
 * en el servidor (host o requireTenantAccess), nunca uno que venga del navegador.
 * Se crea por llamada; no se guarda en una variable de módulo.
 */

const secretKeySchema = z
  .string({ error: "Falta SUPABASE_SECRET_KEY" })
  .min(1, "Falta SUPABASE_SECRET_KEY")
  .refine((key) => !key.startsWith("sb_publishable_"), "SUPABASE_SECRET_KEY tiene una clave publicable");

export function createSupabaseServiceClient() {
  const secretKey = secretKeySchema.parse(process.env.SUPABASE_SECRET_KEY);
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
