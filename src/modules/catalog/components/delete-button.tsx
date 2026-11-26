"use client";

import { useActionState } from "react";
import { buttonClasses } from "@/ui/button-classes";
import { FormError } from "@/ui/form";
import type { FormState } from "../actions";

/** Botón de borrar con confirmación. La acción vuelve a verificar el acceso en el servidor. */
export function DeleteButton({
  action,
  label,
  confirmMessage,
}: {
  action: () => Promise<FormState>;
  label: string;
  confirmMessage: string;
}) {
  const [state, formAction, pending] = useActionState(async () => action(), {});

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <FormError message={state.error} />
      <div>
        <button
          type="submit"
          disabled={pending}
          className={buttonClasses("danger")}
        >
          {pending ? "Borrando…" : label}
        </button>
      </div>
    </form>
  );
}
