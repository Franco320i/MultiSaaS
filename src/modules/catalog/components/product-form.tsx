"use client";

import { useActionState } from "react";
import { centsToInput } from "@/lib/money";
import { Checkbox, FormError, Select, SubmitButton, TextArea, TextField } from "@/ui/form";
import type { FormState } from "../actions";
import type { Category, Product } from "../queries";

export function ProductForm({
  action,
  product,
  categories,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  product?: Product;
  categories: Pick<Category, "id" | "name">[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});

  // Si el envío falló, se vuelve a mostrar lo que se escribió; si no, los datos guardados.
  const sent = state.fields;
  const value = (key: string, saved: string | null | undefined) => (sent ? (sent[key] ?? "") : (saved ?? ""));
  const checked = (key: string, saved: boolean) => (sent ? sent[key] === "on" : saved);

  return (
    // La key vuelve a montar el formulario tras un envío fallido: así un <select> también
    // toma el valor enviado (React solo aplica su valor inicial al montarlo).
    <form key={sent ? JSON.stringify(sent) + state.error : "inicial"} action={formAction} className="flex flex-col gap-4">
      <TextField label="Nombre" name="name" defaultValue={value("name", product?.name)} required maxLength={120} />
      <TextArea
        label="Descripción (opcional)"
        name="description"
        defaultValue={value("description", product?.description)}
        maxLength={2000}
      />
      <Select
        label="Categoría"
        name="category_id"
        defaultValue={value("category_id", product?.category_id)}
        options={[{ value: "", label: "Sin categoría" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Precio ($)"
          name="price"
          defaultValue={value("price", product ? centsToInput(product.price) : "")}
          required
          inputMode="decimal"
          placeholder="18.000"
        />
        <TextField
          label="Precio anterior ($, opcional)"
          name="compare_at_price"
          defaultValue={value(
            "compare_at_price",
            product?.compare_at_price != null ? centsToInput(product.compare_at_price) : "",
          )}
          inputMode="decimal"
          hint="Se muestra tachado, para ofertas."
        />
      </div>
      <Checkbox
        label="Publicado"
        name="is_published"
        defaultChecked={checked("is_published", product?.is_published ?? false)}
        hint="Si no está publicado, solo lo ves vos en el panel."
      />
      <Checkbox
        label="Disponible"
        name="is_available"
        defaultChecked={checked("is_available", product?.is_available ?? true)}
        hint="Destildalo cuando no haya stock: se muestra como agotado."
      />
      <Checkbox label="Destacado" name="is_featured" defaultChecked={checked("is_featured", product?.is_featured ?? false)} />
      <FormError message={state.error} />
      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
