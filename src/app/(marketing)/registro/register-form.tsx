"use client";

import { useActionState, useId } from "react";
import { useTurnstileSubmit } from "@/ui/use-turnstile-submit";
import { registerAction, type RegisterState } from "./actions";

/** Formulario de registro: email, contraseña y Turnstile (se pide el token al enviar). */
export function RegisterForm({ turnstileSiteKey, minPasswordLength }: { turnstileSiteKey: string; minPasswordLength: number }) {
  const id = useId();
  const { formRef, tokenRef, containerRef, onSubmit, verifying } = useTurnstileSubmit(turnstileSiteKey, "dark");
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerAction, {});

  if (state.sentTo) {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-2xl bg-surface p-6">
        <h2 className="font-display text-[24px] leading-tight">Revisá tu correo</h2>
        <p>
          Te mandamos un enlace a <strong>{state.sentTo}</strong>. Abrilo para confirmar tu cuenta y armar tu catálogo.
        </p>
        <p className="text-[15px] text-muted">Si no lo ves en unos minutos, fijate en la carpeta de correo no deseado.</p>
      </div>
    );
  }

  const field = "min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-[16px]";

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-email`} className="text-[15px] font-semibold">
          Email
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          className={field}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-password`} className="text-[15px] font-semibold">
          Contraseña
        </label>
        <input
          id={`${id}-password`}
          name="password"
          type="password"
          required
          minLength={minPasswordLength}
          autoComplete="new-password"
          aria-describedby={`${id}-password-hint`}
          className={field}
        />
        <p id={`${id}-password-hint`} className="text-[14px] text-muted">
          Al menos {minPasswordLength} caracteres.
        </p>
      </div>
      <input ref={tokenRef} type="hidden" name="turnstileToken" />
      <div ref={containerRef} />
      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[15px] font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || verifying}
        className="min-h-12 rounded-full bg-accent px-6 text-[16px] font-semibold text-accent-foreground disabled:opacity-60"
      >
        {pending || verifying ? "Creando la cuenta…" : "Crear mi cuenta"}
      </button>
    </form>
  );
}
