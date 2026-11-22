"use client";

import { useActionState } from "react";
import { MAX_TAGS, tagOptionsFor, type ProductSpec } from "@/lib/catalog-options";
import { centsToInput } from "@/lib/money";
import { Checkbox, FormError, Select, SubmitButton, TextArea, TextField } from "@/ui/form";
import type { FormState } from "../actions";
import type { Category, Product } from "../queries";
import { SpecsEditor } from "./specs-editor";

export function ProductForm({
  action,
  product,
  categories,
  templateKey,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  product?: Product;
  categories: Pick<Category, "id" | "name">[];
  /** Rubro del comercio: define qué etiquetas se ofrecen. */
  templateKey: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});

  // Si el envío falló, se vuelve a mostrar lo que se escribió; si no, los datos guardados.
  const sent = state.fields;
  const value = (key: string, saved: string | null | undefined) => (sent ? (sent[key] ?? "") : (saved ?? ""));
  const checked = (key: string, saved: boolean) => (sent ? sent[key] === "on" : saved);
  const tags = sent ? (sent.tags ?? "").split(",") : (product?.tags ?? []);
  const specs: ProductSpec[] = sent ? parseSpecs(sent.specs) : ((product?.specs as ProductSpec[] | undefined) ?? []);

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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">
          Etiquetas <span className="font-normal opacity-70">(hasta {MAX_TAGS})</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {tagOptionsFor(templateKey, product?.tags ?? []).map((tag) => (
            <label
              key={tag.value}
              className="flex min-h-11 items-center gap-2 rounded-full border border-foreground/20 px-4 has-[:checked]:border-foreground has-[:checked]:font-semibold"
            >
              <input type="checkbox" name="tags" value={tag.value} defaultChecked={tags.includes(tag.value)} className="size-4" />
              {tag.label}
            </label>
          ))}
        </div>
        <p className="text-sm opacity-70">«Oferta» aparece sola cuando cargás un precio anterior.</p>
      </fieldset>
      <SpecsEditor initial={specs} />
      <Checkbox label="Destacado" name="is_featured" defaultChecked={checked("is_featured", product?.is_featured ?? false)} />
      <FormError message={state.error} />
      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

function parseSpecs(json: string | undefined): ProductSpec[] {
  if (!json) return [];
  try {
    const rows: unknown = JSON.parse(json);
    return Array.isArray(rows) ? rows.filter((r): r is ProductSpec => typeof r?.label === "string" && typeof r?.value === "string") : [];
  } catch {
    return [];
  }
}
