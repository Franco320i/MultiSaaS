import { NextResponse, type NextRequest } from "next/server";
import { decideRoute } from "@/core/tenancy/route";
import { env } from "@/lib/env";

/**
 * Proxy de Next.js 16 (antes "middleware"). Diseño, sección 7:
 * lee el host, bloquea rutas internas y reescribe a /sites, /panel o /admin.
 * No consulta la base de datos ni toca la sesión (la sesión llega en la etapa 3,
 * y solo para los hosts del panel y del admin).
 */
export function proxy(request: NextRequest) {
  const decision = decideRoute({
    rawHost: request.headers.get("host"),
    pathname: request.nextUrl.pathname,
    rootDomain: env.ROOT_DOMAIN,
  });

  switch (decision.action) {
    case "next":
      return NextResponse.next();

    case "rewrite": {
      const url = request.nextUrl.clone();
      url.pathname = decision.pathname;
      const response = NextResponse.rewrite(url);
      if (decision.private) {
        // Panel y admin nunca se cachean (diseño, sección 12).
        response.headers.set("Cache-Control", "private, no-store");
      }
      return response;
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
