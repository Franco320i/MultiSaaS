"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef } from "react";
import { centsToInput } from "@/lib/money";
import { quickUpdateProductAction, type QuickEditState } from "@/modules/catalog/actions";
import { buttonClasses } from "@/ui/button-classes";
import { FormError, Select, Switch, TextField } from "@/ui/form";
import { useToast } from "@/ui/toast";
import type { ProductRow } from "./products-browser";

const HISTORY_KEY = "edicionRapida";

/**
 * Hoja para cambiar lo de todos los días (nombre, precio, categoría, visible y stock) sin
 * salir de la lista (docs/superpowers/specs/2026-11-26-rediseno-panel-recorridos-design.md).
 * Como la ficha del catálogo, deja una marca en el historial: Atrás la cierra. Al guardar
 * avisa "Se guardó" y se cierra; la lista queda con su filtro y su búsqueda.
 */
export function QuickEditSheet({
  slug,
  product,
  categories,
  onClose,
}: {
  slug: string;
  product: ProductRow;
  categories: { id: string; name: string }[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Si la entrada que agregó la hoja sigue en el historial. No se lee history.state: el
  // refresh() de la acción hace que Next reemplace ese estado y borre la marca propia.
  const hasEntry = useRef(false);
  const { show } = useToast();

  // Cerrar: si la entrada de la hoja sigue, Atrás la saca (y popstate cierra); si no, se cierra directo.
  const requestClose = useCallback(() => {
    if (hasEntry.current) window.history.back();
    else onClose();
  }, [onClose]);

  // El aviso y el cierre van dentro de la acción y no en un efecto: si el producto sale del
  // filtro, la lista nueva ya no lo trae y la hoja se cerraría antes de que corra un efecto.
  const [state, formAction, pending] = useActionState<QuickEditState, FormData>(async (prev, formData) => {
    const result = await quickUpdateProductAction(slug, product.id, prev, formData);
    if (result.saved) {
      show("Se guardó");
      requestClose();
    }
    return result;
  }, {});

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    window.history.pushState({ [HISTORY_KEY]: true }, "");
    hasEntry.current = true;
    const onPop = () => {
      hasEntry.current = false;
      onClose();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      dialog?.close();
    };
  }, [onClose]);

  // Si el envío falló, se vuelve a mostrar lo que se escribió.
  const sent = state.fields;
  const value = (key: string, saved: string) => (sent ? (sent[key] ?? "") : saved);
  const checked = (key: string, saved: boolean) => (sent ? sent[key] === "on" : saved);
  const titleId = `editar-${product.id}`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Si el navegador cierra el diálogo por su cuenta (Esc dos veces seguidas), se ordena igual.
      onClose={() => {
        if (dialogRef.current?.open === false) requestClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-background p-0 text-foreground backdrop:bg-black/50 sm:m-auto sm:max-h-[90dvh] sm:max-w-lg sm:rounded-3xl"
    >
      <form key={sent ? JSON.stringify(sent) + state.error : "inicial"} action={formAction} className="flex flex-col">
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-[13px] font-semibold text-muted">Editar producto</span>
            <h2 id={titleId} className="font-display text-[22px] leading-tight text-balance">
              {product.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Cerrar"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="size-5">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="flex flex-col gap-3 px-5 pb-4">
          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
            <TextField label="Nombre" name="name" defaultValue={value("name", product.name)} required maxLength={120} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Precio ($)" name="price" defaultValue={value("price", centsToInput(product.price))} required inputMode="decimal" />
              <TextField
                label="Antes ($)"
                name="compare_at_price"
                defaultValue={value("compare_at_price", product.compareAtPrice != null ? centsToInput(product.compareAtPrice) : "")}
                inputMode="decimal"
                placeholder="Opcional"
                hint="Se ve tachado."
              />
            </div>
            <Select
              label="Categoría"
              name="category_id"
              defaultValue={value("category_id", product.categoryId ?? "")}
              options={[{ value: "", label: "Sin categoría" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </section>
          <section aria-label="Cómo se muestra" className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface px-4 py-1">
            <Switch label="Se ve en tu catálogo" name="is_published" defaultChecked={checked("is_published", product.isPublished)} />
            <Switch
              label="Hay stock"
              name="is_available"
              defaultChecked={checked("is_available", product.isAvailable)}
              hint="Sin stock se ve, pero no se puede pedir."
            />
          </section>
          <Link
            href={`/${slug}/productos/${product.id}`}
            replace
            className="flex min-h-11 w-fit items-center text-[15px] font-semibold text-accent underline underline-offset-4"
          >
            Fotos, opciones y más
          </Link>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-background px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <FormError message={state.error} />
          <div className="flex gap-2">
            <button type="button" onClick={requestClose} className={buttonClasses("secondary", "md", "flex-1 sm:flex-none")}>
              Cancelar
            </button>
            <button type="submit" disabled={pending} className={buttonClasses("primary", "md", "flex-1 sm:ml-auto sm:flex-none")}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
