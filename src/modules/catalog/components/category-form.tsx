"use client";

import { useActionState } from "react";
import { Checkbox, FormError, SubmitButton, TextArea, TextField } from "@/ui/form";
import type { FormState } from "../actions";
import type { Category } from "../queries";

export function CategoryForm({
  action,
  category,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  category?: Category;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});

  // Si el envío falló, se vuelve a mostrar lo que se escribió; si no, los datos guardados.
  const sent = state.fields;

  return (
    // La key vuelve a montar el formulario tras un envío fallido: así un <select> también
    // toma el valor enviado (React solo aplica su valor inicial al montarlo).
    <form key={sent ? JSON.stringify(sent) + state.error : "inicial"} action={formAction} className="flex flex-col gap-4">
      <TextField label="Nombre" name="name" defaultValue={sent ? sent.name : category?.name} required maxLength={60} />
      <TextArea
        label="Descripción (opcional)"
        name="description"
        defaultValue={sent ? sent.description : category?.description}
        maxLength={300}
      />
      <Checkbox
        label="Visible en el catálogo"
        name="is_visible"
        defaultChecked={sent ? sent.is_visible === "on" : (category?.is_visible ?? true)}
        hint="Si la ocultás, sus productos no se muestran en el catálogo público."
      />
      <FormError message={state.error} />
      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
