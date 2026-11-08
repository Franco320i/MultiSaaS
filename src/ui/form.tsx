"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Componentes de formulario sin lógica de negocio (diseño, sección 2: src/ui). */

const inputClass = "rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-base";

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
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{props.label}</span>
      <input
        name={props.name}
        defaultValue={props.defaultValue ?? ""}
        required={props.required}
        maxLength={props.maxLength}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
        className={inputClass}
      />
      {props.hint && <span className="opacity-60">{props.hint}</span>}
    </label>
  );
}

export function TextArea(props: { label: string; name: string; defaultValue?: string | null; maxLength?: number }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{props.label}</span>
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
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{props.label}</span>
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
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" name={props.name} defaultChecked={props.defaultChecked} className="mt-1" />
      <span>
        <span className="font-medium">{props.label}</span>
        {props.hint && <span className="block opacity-60">{props.hint}</span>}
      </span>
    </label>
  );
}

export function SubmitButton({ children, pendingLabel = "Guardando…" }: { children: ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
      {message}
    </p>
  );
}
