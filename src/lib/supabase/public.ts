import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env.public";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para el catálogo público (diseño, sección 12, regla 2):
 * clave publicable, SIN sesión y SIN cookies. La respuesta nunca depende de quién la
 * pide, por eso lo que se lee con este cliente se puede cachear (con el comercio o el
 * host en la clave). RLS actúa como `anon`.
 *
 * Se crea dentro de cada función que lo usa; no se guarda en una variable de módulo.
 */
export function createSupabasePublicClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}
