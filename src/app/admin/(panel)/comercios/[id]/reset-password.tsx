"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { resetOwnerPasswordAction, type ResetPasswordState } from "@/app/admin/(panel)/actions";
import { adminInput } from "@/app/admin/(panel)/admin-form";
import { CredentialsCard } from "@/app/admin/(panel)/credentials-card";

/**
 * "Nueva contraseña" para el dueño (solo superadmin): pide confirmar y el motivo, porque la
 * anterior deja de servir. La nueva se muestra una vez para mandarla por WhatsApp.
 * El foco acompaña cada paso (confirmación, resultado) para quien usa teclado o lector.
 */
export function ResetPassword({ tenantId }: { tenantId: string }) {
  const id = useId();
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(resetOwnerPasswordAction.bind(null, tenantId), {});
  const [confirming, setConfirming] = useState(false);
  const reasonRef = useRef<HTMLInputElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirming) reasonRef.current?.focus();
    else if (wasConfirming.current) openRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  useEffect(() => {
    if (state.credentials) resultRef.current?.focus();
  }, [state.credentials]);

  return (
    <div className="flex flex-col gap-3">
      {/* Siempre montada: así el lector de pantalla anuncia el resultado o el error. */}
      <div aria-live="polite" className="contents">
        {state.error ? <p className="text-[14px] font-semibold text-danger">{state.error}</p> : null}
        {state.credentials ? <p className="text-[14px] font-semibold text-accent">{state.saved}</p> : null}
      </div>

      {state.credentials ? (
        <div ref={resultRef} tabIndex={-1} className="outline-none">
          <CredentialsCard credentials={state.credentials} />
        </div>
      ) : (
        <>
          <p className="text-[14px] text-muted">Si el dueño se olvidó la contraseña, generale una nueva y mandásela por WhatsApp.</p>
          {confirming ? (
            <form action={action} className="flex flex-col gap-3">
              <p className="text-[14px]">La contraseña actual va a dejar de servir y se cierran las sesiones abiertas del dueño.</p>
              <label htmlFor={`${id}-reason`} className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
                Motivo (queda en la auditoría)
                <input
                  ref={reasonRef}
                  id={`${id}-reason`}
                  name="reason"
                  required
                  minLength={3}
                  maxLength={500}
                  placeholder="Se olvidó la contraseña"
                  className={adminInput}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="admin-btn min-h-10 rounded-[10px] border border-danger/40 bg-danger-soft px-4 text-[14px] font-semibold text-danger disabled:opacity-60"
                >
                  {pending ? "Generando…" : "Generar contraseña nueva"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="admin-btn min-h-10 rounded-[10px] px-3 text-[14px] font-semibold text-muted"
                >
                  No
                </button>
              </div>
            </form>
          ) : (
            <button
              ref={openRef}
              type="button"
              onClick={() => setConfirming(true)}
              className="admin-btn min-h-10 w-fit rounded-[10px] border border-line bg-surface-muted px-4 text-[14px] font-semibold"
            >
              Nueva contraseña
            </button>
          )}
        </>
      )}
    </div>
  );
}
