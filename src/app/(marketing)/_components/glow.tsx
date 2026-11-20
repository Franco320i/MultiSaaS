/** Resplandor violeta de fondo. Solo detrás del hero y del cierre. */
export function Glow({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -z-10 bg-[radial-gradient(closest-side,rgba(124,58,237,0.32),transparent)] ${className}`}
    />
  );
}
