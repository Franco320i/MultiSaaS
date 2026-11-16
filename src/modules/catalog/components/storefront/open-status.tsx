"use client";

import { useSyncExternalStore } from "react";
import { isOpenAt, type HoursRange, type OpenMode } from "@/lib/hours";

/**
 * "Abierto ahora" / "Cerrado ahora". Se calcula en el navegador con la hora actual y la
 * zona horaria del comercio: así la página del catálogo se puede cachear (la hora no
 * entra en el HTML). En el servidor no se muestra nada.
 */

const subscribe = (onChange: () => void) => {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
};

export function OpenStatus({
  hours,
  mode,
  timeZone,
  closedMessage,
}: {
  hours: HoursRange[];
  mode: OpenMode;
  timeZone: string;
  closedMessage: string | null;
}) {
  const open = useSyncExternalStore(
    subscribe,
    () => isOpenAt(hours, mode, new Date(), timeZone),
    () => null,
  );

  // Sin horarios cargados y en modo automático no sabemos: mejor no decir nada.
  if (mode === "auto" && hours.length === 0) return null;
  if (open === null) return <span className="invisible">Abierto ahora</span>;

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <span aria-hidden className={`size-2 rounded-full ${open ? "bg-accent" : "bg-danger"}`} />
        {open ? "Abierto ahora" : "Cerrado ahora"}
      </span>
      {!open && closedMessage ? <span className="text-muted">{closedMessage}</span> : null}
    </span>
  );
}
