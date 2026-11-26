import type { ReactNode } from "react";

/**
 * Cabecera de pantalla del panel (estilo PPW): sobretítulo dorado, título, una línea que
 * dice para qué sirve la pantalla y una sola acción a la derecha.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1">
      {eyebrow ? <p className="text-[12px] font-bold tracking-wide text-accent-2 uppercase">{eyebrow}</p> : null}
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-display text-[28px] leading-tight">{title}</h1>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {description ? <p className="text-[15px] text-muted">{description}</p> : null}
    </header>
  );
}
