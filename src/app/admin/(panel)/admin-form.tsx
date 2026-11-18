"use client";

import { useActionState, type ReactNode } from "react";
import type { AdminFormState } from "./actions";

/** Formulario de una acción del panel central: mensaje de resultado y botón con movimiento. */
export function AdminForm({
  action,
  submitLabel,
  tone = "primary",
  children,
}: {
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  submitLabel: string;
  tone?: "primary" | "danger" | "neutral";
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const button = {
    primary: "bg-accent text-accent-foreground border-transparent",
    danger: "bg-danger-soft text-danger border-danger/40",
    neutral: "bg-surface-muted text-foreground border-line",
  }[tone];

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {children}
      {state.error ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {state.error}
        </p>
      ) : state.saved ? (
        <p role="status" className="text-[14px] font-semibold text-accent">
          {state.saved}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={`admin-btn min-h-10 w-fit rounded-[10px] border px-4 text-[14px] font-semibold disabled:opacity-60 ${button}`}>
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}

export const adminInput =
  "min-h-10 w-full rounded-[10px] border border-line bg-background px-3 text-[14px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none";
