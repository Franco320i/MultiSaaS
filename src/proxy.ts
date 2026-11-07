import { NextResponse, type NextRequest } from "next/server";
import { decideRoute } from "@/core/tenancy/route";
import { env } from "@/lib/env";
import { refreshSession } from "@/lib/supabase/proxy-session";

/**
 * Proxy de Next.js 16 (antes "middleware"). Diseño, secciones 6, 7 y 12:
 * - lee el host, bloquea rutas internas y reescribe a /sites, /panel o /admin;
 * - no consulta tablas de la base;
 * - refresca la sesión de Supabase SOLO en los hosts del panel y del admin.
 *   El catálogo público nunca recibe ni escribe cookies de sesión.
 */
export async function proxy(request: NextRequest) {
  const decision = decideRoute({
    rawHost: request.headers.get("host"),
    pathname: request.nextUrl.pathname,
    rootDomain: env.ROOT_DOMAIN,
  });

  switch (decision.action) {
    case "next":
    case "rewrite": {
      const makeResponse = () => {
        let response: NextResponse;
        if (decision.action === "rewrite") {
          const url = request.nextUrl.clone();
          url.pathname = decision.pathname;
          response = NextResponse.rewrite(url, { request });
        } else {
          response = NextResponse.next({ request });
        }
        if (decision.private) {
          // Panel y admin nunca se cachean (diseño, sección 12).
          response.headers.set("Cache-Control", "private, no-store");
        }
        return response;
      };

      return decision.private ? refreshSession(request, makeResponse) : makeResponse();
    }

    case "redirect-to-root": {
      // URL absoluta armada con el puerto del header Host. Ojo: en `next dev` Next.js
      // considera que toda petición llega a `localhost:3000` y vuelve relativa una
      // redirección a ese origen, así que `www.localhost` no redirige bien en local.
      // En producción el origen de la petición es `www.tuapp.com.ar` y sale absoluta.
      // Verificar en staging (etapa 10).
      const port = request.headers.get("host")?.split(":")[1];
      const { protocol, pathname, search } = request.nextUrl;
      const location = `${protocol}//${env.ROOT_DOMAIN}${port ? `:${port}` : ""}${pathname}${search}`;
      return new NextResponse(null, { status: 308, headers: { Location: location } });
    }

    case "not-found":
      return new NextResponse("No encontrado", { status: 404 });

    case "bad-request":
      return new NextResponse("Solicitud inválida", { status: 400 });
  }
}

export const config = {
  matcher: [
    // Todo menos recursos estáticos de Next y archivos con extensión de imagen o ícono.
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
