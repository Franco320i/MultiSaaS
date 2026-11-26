"use client";

import { useActionState, useState } from "react";
import { buttonClasses } from "@/ui/button-classes";
import { canCancel, NEXT_STEP, type OrderStatus } from "../status";
import type { StatusActionState } from "../actions";

/**
 * Botón del paso siguiente (la acción principal) y "Cancelar pedido" con confirmación
 * dentro de la misma pantalla. La acción vuelve a verificar el acceso en el servidor.
 */
export function StatusActions({
  status,
  action,
  compact = false,
}: {
  status: OrderStatus;
  action: (status: OrderStatus) => Promise<StatusActionState>;
  compact?: boolean;
}) {
  const [state, run, pending] = useActionState(async (_: StatusActionState, next: OrderStatus) => action(next), {});
  const [confirmCancel, setConfirmCancel] = useState(false);
  const next = NEXT_STEP[status];

  if (!next && !canCancel(status)) return null;

  return (
    <div className="flex flex-col gap-2">
      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-[14px] font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {next && !confirmCancel ? (
          <form action={() => run(next.status)}>
            <button
              type="submit"
              disabled={pending}
              className={buttonClasses("primary")}
            >
              {pending ? "Guardando…" : next.label}
            </button>
          </form>
        ) : null}

        {!compact && canCancel(status) ? (
          confirmCancel ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px]">¿Cancelar este pedido? No se puede deshacer.</span>
              <form action={() => run("cancelled")}>
                <button
                  type="submit"
                  disabled={pending}
                  className={buttonClasses("danger")}
                >
                  Sí, cancelar
                </button>
              </form>
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="min-h-11 px-3 text-[15px] font-semibold text-muted hover:text-foreground"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="min-h-11 px-3 text-[15px] font-semibold text-muted hover:text-danger"
            >
              Cancelar pedido
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
