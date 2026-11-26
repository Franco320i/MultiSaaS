"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { useToast } from "@/ui/toast";
import type { SettingsFormState } from "../actions";

/** Piezas de formulario del asistente y de Ajustes (sistema visual Sobremesa). */

export const inputClass =
  "min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-[16px] text-foreground placeholder:text-muted";

export function Field({
  id,
  label,
  hint,
  optional,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {label} {optional ? <span className="font-normal text-muted">(opcional)</span> : null}
      </label>
      {children}
      {hint ? <p className="text-[14px] text-muted">{hint}</p> : null}
    </div>
  );
}

/**
 * Formulario con su acción: mensaje de error o "Se guardó", y el botón principal.
 * `next`: paso siguiente del asistente ("Guardar y seguir"); sin `next`, es Ajustes.
 * React vacía el formulario después de cada envío: con `key` se vuelve a montar con
 * los valores enviados cuando hay un error (state.fields).
 */
export function SettingsForm({
  action,
  next,
  submitLabel,
  children,
}: {
  action: (prev: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  next?: string;
  submitLabel: string;
  children: (fields: Record<string, string> | undefined) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const { show } = useToast();
  useEffect(() => {
    if (state.saved) show("Se guardó");
  }, [state, show]);
  return (
    <form action={formAction} key={JSON.stringify(state.fields ?? null)} className="flex flex-col gap-5">
      {children(state.fields)}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[15px] font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-full bg-accent px-6 text-[16px] font-semibold text-accent-foreground disabled:opacity-60 sm:w-fit"
      >
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
