"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { summarizeHours, todayHours, type HoursRange } from "@/lib/hours";
import { ChevronDownIcon, ClockIcon } from "./icons";

/**
 * "Hoy: 19:00 a 0:30" con la semana desplegable. "Hoy" depende de la fecha y de la zona
 * del comercio: se calcula en el navegador (como OpenStatus) para no meter la hora en el
 * HTML cacheado. En el servidor se muestra solo la etiqueta.
 */
const subscribe = (onChange: () => void) => {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
};

export function TodayHours({ hours, timeZone }: { hours: HoursRange[]; timeZone: string }) {
  const today = useSyncExternalStore(
    subscribe,
    () => todayHours(hours, new Date(), timeZone),
    () => null,
  );
  const week = summarizeHours(hours);

  return (
    <details className="group col-span-2 rounded-xl open:bg-brand-tint/60 sm:col-span-1 dark:open:bg-surface-muted">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-xl p-2 [&::-webkit-details-marker]:hidden">
        <StatusIcon>
          <ClockIcon />
        </StatusIcon>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] leading-tight text-muted">Hoy</span>
          <span className="block text-[14px] leading-tight font-semibold tabular-nums">{today ?? " "}</span>
        </span>
        <span className="text-muted transition-transform group-open:rotate-180">
          <ChevronDownIcon />
          <span className="sr-only">Ver los horarios de la semana</span>
        </span>
      </summary>
      <ul className="flex flex-col gap-0.5 px-2 pb-2 pl-[3.1rem] text-[14px] text-muted">
        {week.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
}

/** Ícono de un dato de la tarjeta de estado: cuadrado del tinte del comercio. */
export function StatusIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand-tint text-brand dark:bg-surface-muted dark:text-foreground">
      {children}
    </span>
  );
}
