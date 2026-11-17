"use client";

import { useState } from "react";
import type { SettingsFormState } from "../actions";
import { SettingsForm } from "./fields";

/**
 * Paso "Horarios": cada día abierto o cerrado, con uno o dos horarios (por ejemplo,
 * mañana y tarde). Si cierra antes de abrir, cruza la medianoche (19:00 a 00:30).
 */

const DAYS = [
  { weekday: 1, label: "Lunes" },
  { weekday: 2, label: "Martes" },
  { weekday: 3, label: "Miércoles" },
  { weekday: 4, label: "Jueves" },
  { weekday: 5, label: "Viernes" },
  { weekday: 6, label: "Sábado" },
  { weekday: 0, label: "Domingo" },
];

type Range = { weekday: number; opens_at: string; closes_at: string };

export function HoursForm({
  action,
  next,
  submitLabel,
  hours,
}: {
  action: (prev: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  next?: string;
  submitLabel: string;
  hours: Range[];
}) {
  return (
    <SettingsForm action={action} next={next} submitLabel={submitLabel}>
      {() => (
        <>
          <p className="text-[15px] text-muted">
            Con estos horarios el catálogo muestra si estás abierto. Fuera de horario, los clientes arman el pedido pero no lo pueden enviar.
          </p>
          <ul className="flex flex-col divide-y divide-line">
            {DAYS.map((day) => (
              <DayRow key={day.weekday} day={day} ranges={hours.filter((h) => h.weekday === day.weekday)} />
            ))}
          </ul>
        </>
      )}
    </SettingsForm>
  );
}

function DayRow({ day, ranges }: { day: { weekday: number; label: string }; ranges: Range[] }) {
  const [open, setOpen] = useState(ranges.length > 0);
  const [split, setSplit] = useState(ranges.length > 1);
  const first = ranges[0] ?? { opens_at: "09:00", closes_at: "13:00" };
  const second = ranges[1] ?? { opens_at: "17:00", closes_at: "21:00" };
  const time = "min-h-11 rounded-lg border border-line bg-surface px-2 text-[15px] tabular-nums";

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <label className="flex min-h-11 w-32 items-center gap-2">
        <input
          type="checkbox"
          name={`open-${day.weekday}`}
          checked={open}
          onChange={(e) => setOpen(e.target.checked)}
          className="size-5 accent-[var(--accent)]"
        />
        <span className="font-semibold">{day.label}</span>
      </label>
      {open ? (
        <div className="flex flex-wrap items-center gap-2">
          <input type="time" name={`opens-${day.weekday}-1`} defaultValue={first.opens_at} aria-label={`${day.label}: abre`} className={time} required />
          <span className="text-muted">a</span>
          <input type="time" name={`closes-${day.weekday}-1`} defaultValue={first.closes_at} aria-label={`${day.label}: cierra`} className={time} required />
          {split ? (
            <>
              <span className="text-muted">y</span>
              <input type="time" name={`opens-${day.weekday}-2`} defaultValue={second.opens_at} aria-label={`${day.label}: abre por segunda vez`} className={time} required />
              <span className="text-muted">a</span>
              <input type="time" name={`closes-${day.weekday}-2`} defaultValue={second.closes_at} aria-label={`${day.label}: cierra por segunda vez`} className={time} required />
              <button type="button" onClick={() => setSplit(false)} className="min-h-11 px-2 text-[14px] font-semibold text-muted hover:text-danger">
                Quitar
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setSplit(true)} className="min-h-11 px-2 text-[14px] font-semibold text-muted hover:text-foreground">
              + Otro horario
            </button>
          )}
        </div>
      ) : (
        <span className="text-[15px] text-muted">Cerrado</span>
      )}
    </li>
  );
}
