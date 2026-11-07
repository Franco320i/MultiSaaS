import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { publicEnv } from "@/lib/env.public";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase con la sesión del usuario, para el panel (Server Components,
 * Server Actions y Route Handlers). RLS actúa siempre.
 *
 * Crear uno POR PETICIÓN: nunca guardarlo en una variable de módulo (diseño, sección 12).
 */
export async function createSupabaseServerClient() {
  // Todo lo que usa la sesión se resuelve en el momento de la petición, nunca en el
  // prerender (la librería consulta la hora para validar el token).
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Desde un Server Component no se pueden escribir cookies. No pasa nada:
            // el proxy ya refrescó la sesión antes de renderizar.
          }
        },
      },
    },
  );
}
