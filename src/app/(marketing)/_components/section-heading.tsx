import type { ReactNode } from "react";

/** Encabezado de sección: etiqueta chica, título y bajada opcional. */
export function SectionHeading({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[13px] font-semibold tracking-[0.08em] text-accent-soft uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-3 font-display text-[30px] leading-tight text-balance md:text-[40px]">
        {title}
      </h2>
      {children ? <p className="mt-4 text-[17px] text-muted">{children}</p> : null}
    </div>
  );
}
