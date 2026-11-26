/** Esqueletos de carga: la forma de lo que viene, nunca una ruedita sola. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-surface-muted motion-reduce:animate-none ${className}`} />;
}

/** Formulario cargando: título, tres campos y el botón. */
export function FormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-5">
      <Skeleton className="h-8 w-48" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 rounded-[14px]" />
        </div>
      ))}
      <Skeleton className="h-11 w-40 rounded-full" />
    </div>
  );
}

/** Lista cargando: título y filas. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-3">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}
