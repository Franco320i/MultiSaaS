/**
 * Estados del catálogo público que no son "con datos". No muestran ningún dato del
 * comercio ni dicen por qué no está disponible (suspendido, sin publicar, etc.).
 */

export function StorefrontUnavailable() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-16 text-center">
      <h1 className="font-display text-[28px] leading-tight">Este catálogo no está disponible</h1>
      <p className="text-muted">Por ahora no se puede ver. Probá de nuevo más tarde.</p>
    </main>
  );
}

export function StorefrontNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-16 text-center">
      <h1 className="font-display text-[28px] leading-tight">No encontramos este catálogo</h1>
      <p className="text-muted">Revisá que la dirección esté bien escrita.</p>
    </main>
  );
}

/** Esqueleto con la forma del catálogo: portada, estado, categorías y productos. */
export function StorefrontSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando el catálogo" className="flex flex-1 flex-col">
      <div className="h-44 bg-surface-muted sm:h-56" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-4">
        <div className="h-4 w-40 rounded-full bg-surface-muted" />
        <div className="flex gap-6 border-b border-line pb-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 w-24 rounded-full bg-surface-muted" />
          ))}
        </div>
        <ul className="flex flex-col divide-y divide-line">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex gap-4 py-4">
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-2/3 rounded-full bg-surface-muted" />
                <div className="h-3 w-full rounded-full bg-surface-muted" />
                <div className="h-4 w-20 rounded-full bg-surface-muted" />
              </div>
              <div className="size-24 rounded-xl bg-surface-muted" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
