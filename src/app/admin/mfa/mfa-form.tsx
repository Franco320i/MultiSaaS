"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { startEnrollmentAction, verifyMfaAction, type Enrollment, type MfaState } from "./actions";

/**
 * Activar o usar el segundo factor. Sin factor verificado: QR + código de la app.
 * Con factor: solo el código. Al verificar, navegación completa (sesión aal2).
 */
export function MfaForm({ factorId }: { factorId: string | null }) {
  const id = useId();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [state, action, pending] = useActionState<MfaState, FormData>(verifyMfaAction, {});

  useEffect(() => {
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);

  const activeFactor = factorId ?? (enrollment && "factorId" in enrollment ? enrollment.factorId : null);

  return (
    <div className="flex flex-col gap-6">
      {!factorId ? (
        enrollment && "factorId" in enrollment ? (
          <div className="flex flex-col gap-3">
            <p className="text-muted">1. Escaneá este código con Google Authenticator, 1Password u otra app de códigos.</p>
            {/* QR que devuelve Supabase (data URI SVG). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrollment.qrCode} alt="Código QR para la app autenticadora" width={176} height={176} className="size-44 rounded-xl bg-white p-2" />
            <p className="text-[14px] text-muted">
              ¿No podés escanear? Cargá esta clave a mano: <code className="break-all font-mono text-foreground">{enrollment.secret}</code>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-muted">El panel central pide un segundo factor. Activalo una vez con una app de códigos y después te lo pide en cada ingreso.</p>
            {enrollment && "error" in enrollment ? (
              <p role="alert" className="font-semibold text-danger">
                {enrollment.error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={async () => setEnrollment(await startEnrollmentAction())}
              className="admin-btn min-h-11 w-fit rounded-[10px] bg-accent px-4 text-[14px] font-semibold text-accent-foreground"
            >
              Activar el segundo factor
            </button>
          </div>
        )
      ) : null}

      {activeFactor ? (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="factorId" value={activeFactor} />
          <label htmlFor={`${id}-code`} className="text-[15px] font-semibold">
            {factorId ? "Código de tu app autenticadora" : "2. Escribí el código de 6 números que muestra la app"}
          </label>
          <input
            id={`${id}-code`}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            className="min-h-12 w-44 rounded-[10px] border border-line bg-surface px-4 text-center font-mono text-[22px] tracking-[0.3em] focus:border-accent focus:outline-none"
          />
          {state.error ? (
            <p role="alert" className="text-[14px] font-semibold text-danger">
              {state.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending || Boolean(state.redirectTo)}
            className="admin-btn min-h-11 w-fit rounded-[10px] bg-accent px-4 text-[14px] font-semibold text-accent-foreground disabled:opacity-60"
          >
            {pending || state.redirectTo ? "Verificando…" : "Entrar al panel central"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
