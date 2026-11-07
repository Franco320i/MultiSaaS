import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/env.public";
import type { Database } from "@/types/database";

/**
 * Refresca la sesión de Supabase dentro del proxy y devuelve la respuesta con las
 * cookies nuevas. Solo se llama para los hosts del panel y del admin: el catálogo
 * público nunca lee ni escribe cookies (diseño, secciones 6 y 12).
 *
 * `makeResponse` arma la respuesta (next o rewrite). Se vuelve a llamar si Supabase
 * escribe cookies, para que la petición reescrita también vea la sesión nueva.
 *
 * Las cookies quedan sin atributo Domain: atadas al host exacto
 * (app.tuapp.com.ar o admin.tuapp.com.ar), nunca a los subdominios de catálogos.
 */
export async function refreshSession(
  request: NextRequest,
  makeResponse: () => NextResponse,
): Promise<NextResponse> {
  let response = makeResponse();

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = makeResponse();
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Cabeceras anti-caché que manda la librería cuando escribe cookies de sesión.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Verifica el token y lo renueva si venció. No usar getSession() en el servidor.
  await supabase.auth.getClaims();

  return response;
}
