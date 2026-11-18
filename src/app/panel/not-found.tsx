import Link from "next/link";

// No existe, no es de este comercio o no hay permiso: misma respuesta para todo,
// sin confirmar qué existe (diseño, sección 6).
// Va en /panel y no en /panel/[tenant]: el notFound() de requireTenantAccess salta también
// desde el menú del layout de [tenant], y el not-found de un segmento no atrapa lo que
// lanza su propio layout (sin esto se veía el 404 genérico de Next, en inglés).
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-16 text-center">
      <h1 className="font-display text-[28px] leading-tight">No encontramos esta página</h1>
      <p className="text-muted">Puede que no exista o que no tengas acceso.</p>
      <Link href="/" className="mx-auto mt-2 min-h-11 py-2 text-[15px] font-semibold underline underline-offset-4">
        Ir a mis comercios
      </Link>
    </main>
  );
}
