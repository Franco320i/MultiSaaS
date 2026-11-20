import type { ReactNode } from "react";

/** Dato que falta completar antes de producción. Se ve a propósito. */
export function Pending({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-surface-muted px-1.5 py-0.5 font-semibold text-accent-soft">[PENDIENTE: {children}]</mark>;
}

/** Página legal con ancho de lectura cómodo. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[68ch] px-4 py-14 md:py-20">
      <p role="note" className="rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] text-muted">
        Borrador: falta completar los datos del responsable antes de publicar.
      </p>
      <h1 className="mt-8 font-display text-[36px] leading-tight md:text-[44px]">{title}</h1>
      <p className="mt-2 text-[15px] text-muted">Última actualización: {updated}</p>
      <div className="mt-8 flex flex-col gap-4 text-[17px] leading-relaxed text-foreground/90 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </main>
  );
}
