/** Marca de la plataforma: "vidri" en la tipografía de títulos y el punto en violeta. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-[22px] leading-none ${className}`}>
      vidri<span className="text-accent-soft">.</span>
    </span>
  );
}
