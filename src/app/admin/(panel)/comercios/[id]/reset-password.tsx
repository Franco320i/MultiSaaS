"use client";

import { useActionState, useState } from "react";
import { resetOwnerPasswordAction, type ResetPasswordState } from "@/app/admin/(panel)/actions";
import { CredentialsCard } from "@/app/admin/(panel)/credentials-card";

/**
 * "Nueva contraseña" para el dueño (solo superadmin): pide confirmar, porque la anterior
 * deja de servir. La nueva se muestra una vez para mandarla por WhatsApp.
 */
export function ResetPassword({ tenantId }: { tenantId: string }) {
  const [state, action, pending] = useActionState<ResetPasswordState>(resetOwnerPasswordAction.bind(null, tenantId), {});
  const [confirming, setConfirming] = useState(false);

  if (state.credentials) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="text-[14px] font-semibold text-accent">
          {state.saved}
        </p>
        <CredentialsCard credentials={state.credentials} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">Si el dueño se olvidó la contraseña, generale una nueva y mandásela por WhatsApp.</p>
      {state.error ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      {confirming ? (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <span className="text-[14px]">La contraseña actual va a dejar de servir. ¿Seguimos?</span>
          <button
            type="submit"
            disabled={pending}
            className="admin-btn min-h-10 rounded-[10px] border border-danger/40 bg-danger-soft px-4 text-[14px] font-semibold text-danger disabled:opacity-60"
          >
            {pending ? "Generando…" : "Sí, generar"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="min-h-10 px-3 text-[14px] font-semibold text-muted">
            No
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="admin-btn min-h-10 w-fit rounded-[10px] border border-line bg-surface-muted px-4 text-[14px] font-semibold"
        >
          Nueva contraseña
        </button>
      )}
    </div>
  );
}
