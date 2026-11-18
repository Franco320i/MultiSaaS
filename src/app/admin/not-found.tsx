// Sin acceso o no existe: misma respuesta, sin confirmar qué hay en el panel central.
export default function AdminNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-[26px] font-semibold tracking-tight">No encontramos esta página</h1>
      <p className="text-muted">Puede que no exista o que tu usuario no tenga acceso.</p>
    </main>
  );
}
