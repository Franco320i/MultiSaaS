"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClasses } from "./button-classes";

/** Componentes de formulario sin lógica de negocio (diseño, sección 2: src/ui). */

const inputClass =
  "min-h-12 rounded-[14px] border border-line bg-field px-3.5 py-2 text-[16px] text-foreground " +
  "focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-soft";

export function TextField(props: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  inputMode?: "text" | "decimal";
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[15px]">
      <span className="font-semibold">{props.label}</span>
      <input
        name={props.name}
        defaultValue={props.defaultValue ?? ""}
        required={props.required}
        maxLength={props.maxLength}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
        className={inputClass}
      />
      {props.hint && <span className="text-[14px] text-muted">{props.hint}</span>}
    </label>
  );
}

export function TextArea(props: { label: string; name: string; defaultValue?: string | null; maxLength?: number }) {
  return (
    <label className="flex flex-col gap-1.5 text-[15px]">
      <span className="font-semibold">{props.label}</span>
      <textarea
        name={props.name}
        defaultValue={props.defaultValue ?? ""}
        maxLength={props.maxLength}
        rows={3}
        className={inputClass}
      />
    </label>
  );
}

export function Select(props: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[15px]">
      <span className="font-semibold">{props.label}</span>
      <select name={props.name} defaultValue={props.defaultValue ?? ""} className={inputClass}>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Checkbox(props: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex min-h-11 items-start gap-3 text-[15px]">
      <input type="checkbox" name={props.name} defaultChecked={props.defaultChecked} className="mt-0.5 size-5 accent-[var(--accent)]" />
      <span>
        <span className="font-semibold">{props.label}</span>
        {props.hint && <span className="block text-[14px] text-muted">{props.hint}</span>}
      </span>
    </label>
  );
}

/**
 * Interruptor (casilla con forma de interruptor): se envía igual que un checkbox ("on" o nada).
 * Con explicación debajo del título, para que se entienda sin conocer la palabra técnica.
 */
export function Switch(props: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-[16px] font-semibold">{props.label}</span>
        {props.hint && <span className="text-[14px] text-muted">{props.hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        name={props.name}
        defaultChecked={props.defaultChecked}
        className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-line-strong transition-colors before:absolute before:top-1 before:left-1 before:size-5 before:rounded-full before:bg-white before:shadow before:transition-all checked:bg-accent checked:before:left-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
    </label>
  );
}

export function SubmitButton({ children, pendingLabel = "Guardando…" }: { children: ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClasses("primary", "md", "w-full sm:w-auto")}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-[15px] text-danger">
      {message}
    </p>
  );
}
