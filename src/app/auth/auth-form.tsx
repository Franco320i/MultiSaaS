"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { useTurnstileSubmit } from "@/ui/use-turnstile-submit";
import type { AuthFormState } from "./actions";

type Props = {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
  pendingLabel: string;
  children: ReactNode;
};

/** Formulario genérico de Auth: muestra el error o el mensaje que devuelve la acción. */
export function AuthForm(props: Props) {
  return <TurnstileAuthForm {...props} turnstileSiteKey={null} />;
}

/**
 * Igual que AuthForm, pero pide el token de Turnstile antes de enviar (login y
 * recuperación: Supabase Auth exige captcha en esas llamadas, ver core/auth/captcha.ts).
 */
export function TurnstileAuthForm({
  action,
  submitLabel,
  pendingLabel,
  children,
  turnstileSiteKey,
}: Props & { turnstileSiteKey: string | null }) {
  const [state, formAction, pending] = useActionState(action, {});
  const { formRef, tokenRef, containerRef, onSubmit, verifying } = useTurnstileSubmit(turnstileSiteKey ?? "");

  // Navegación completa (ver AuthFormState en actions.ts).
  useEffect(() => {
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={turnstileSiteKey ? onSubmit : undefined}
      className="flex flex-col gap-4"
    >
      {children}
      {turnstileSiteKey ? (
        <>
          <input ref={tokenRef} type="hidden" name="turnstileToken" />
          <div ref={containerRef} />
        </>
      ) : null}
      {state.error && (
        <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-300">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || verifying || Boolean(state.redirectTo)}
        className="rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:opacity-60"
      >
        {pending || verifying ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        minLength={minLength}
        className="rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-base"
      />
    </label>
  );
}
