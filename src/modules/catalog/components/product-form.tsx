"use client";

import { useActionState } from "react";
import { MAX_TAGS, tagOptionsFor, type ProductSpec } from "@/lib/catalog-options";
import { centsToInput } from "@/lib/money";
import { FormError, Select, SubmitButton, Switch, TextArea, TextField } from "@/ui/form";
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
  // "Más detalles" se abre solo si al volver con error había algo cargado ahí.
  const detailsOpen = Boolean(sent && (sent.description || sent.tags || sent.specs));

  return (
    // La key vuelve a montar el formulario tras un envío fallido: así un <select> también
    // toma el valor enviado (React solo aplica su valor inicial al montarlo).
    <form key={sent ? JSON.stringify(sent) + state.error : "inicial"} action={formAction} className="flex flex-col gap-3">
      <section aria-labelledby="pf-basico" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
        <h2 id="pf-basico" className="text-[13px] font-semibold tracking-wide text-muted uppercase">
          Lo básico
        </h2>
        <TextField label="Nombre" name="name" defaultValue={value("name", product?.name)} required maxLength={120} placeholder="Hamburguesa doble" />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Precio ($)"
            name="price"
            defaultValue={value("price", product ? centsToInput(product.price) : "")}
            required
            inputMode="decimal"
            placeholder="18.000"
          />
          <TextField
            label="Antes ($)"
            name="compare_at_price"
            defaultValue={value(
              "compare_at_price",
              product?.compare_at_price != null ? centsToInput(product.compare_at_price) : "",
            )}
            inputMode="decimal"
            placeholder="Opcional"
            hint="Para ofertas: se ve tachado."
          />
        </div>
        <Select
          label="Categoría"
          name="category_id"
          defaultValue={value("category_id", product?.category_id)}
          options={[{ value: "", label: "Sin categoría" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />
      </section>

      <section aria-label="Cómo se muestra" className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface px-4 py-1">
        <Switch
          label="Se ve en tu catálogo"
          name="is_published"
          defaultChecked={checked("is_published", product?.is_published ?? true)}
          hint="Apagalo para esconderlo un tiempo."
        />
        <Switch
          label="Hay stock"
          name="is_available"
          defaultChecked={checked("is_available", product?.is_available ?? true)}
          hint="Sin stock se ve, pero no se puede pedir."
        />
        <Switch
          label="Destacado"
          name="is_featured"
          defaultChecked={checked("is_featured", product?.is_featured ?? false)}
          hint="Aparece primero en tu catálogo."
        />
      </section>

      <details open={detailsOpen} className="group rounded-2xl border border-line bg-surface">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col">
            <span className="text-[16px] font-semibold">Más detalles</span>
            <span className="text-[14px] text-muted">Descripción, etiquetas y características</span>
          </span>
          <span aria-hidden className="text-[22px] text-muted transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="flex flex-col gap-5 border-t border-line p-4">
          <TextArea label="Descripción" name="description" defaultValue={value("description", product?.description)} maxLength={2000} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-[15px] font-semibold">
              Etiquetas <span className="font-normal text-muted">(hasta {MAX_TAGS})</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {tagOptionsFor(templateKey, product?.tags ?? []).map((tag) => (
                <label
                  key={tag.value}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 has-[:checked]:border-accent has-[:checked]:bg-surface-muted has-[:checked]:font-semibold"
                >
                  <input type="checkbox" name="tags" value={tag.value} defaultChecked={tags.includes(tag.value)} className="size-4 accent-[var(--accent)]" />
                  {tag.label}
                </label>
              ))}
            </div>
            <p className="text-[14px] text-muted">«Oferta» aparece sola cuando cargás un precio anterior.</p>
          </fieldset>
          <SpecsEditor initial={specs} />
        </div>
      </details>

      <div className="sticky bottom-20 z-10 -mx-4 flex flex-col gap-2 border-t border-line bg-background/95 px-4 py-3 backdrop-blur md:bottom-0">
        <FormError message={state.error} />
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
