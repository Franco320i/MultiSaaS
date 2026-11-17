"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { formatCents } from "@/lib/money";
import type { ImportState } from "../actions";

/**
 * Importar productos pegando celdas de una planilla: primero se revisa (vista previa con
 * errores por fila) y después se importa lo que está bien. Nada se guarda en la revisión.
 */
export function ImportForm({
  previewAction,
  importAction,
  productsHref,
}: {
  previewAction: (prev: ImportState, formData: FormData) => Promise<ImportState>;
  importAction: (prev: ImportState, formData: FormData) => Promise<ImportState>;
  productsHref: string;
}) {
  const id = useId();
  const [preview, runPreview, previewing] = useActionState(previewAction, {});
  const [imported, runImport, importing] = useActionState(importAction, {});

  if (imported.result) {
    const { created, categoriesCreated, failed } = imported.result;
    return (
      <div role="status" className="flex flex-col gap-4 rounded-2xl bg-surface p-5">
        <h2 className="font-display text-[24px] leading-tight">
          {created === 0 ? "No se importó ningún producto" : `Importaste ${created} ${created === 1 ? "producto" : "productos"}`}
        </h2>
        {categoriesCreated > 0 ? <p className="text-muted">También creamos {categoriesCreated} {categoriesCreated === 1 ? "categoría" : "categorías"} nuevas.</p> : null}
        {failed.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-danger">Estas filas no se pudieron importar:</p>
            <ul className="text-[15px]">
              {failed.map((f) => (
                <li key={f.line}>
                  Fila {f.line}: {f.error}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-[15px] text-muted">Quedaron publicados. Podés sumarles fotos desde la lista de productos.</p>
        <Link href={productsHref} className="flex min-h-12 w-fit items-center rounded-full bg-accent px-6 text-[16px] font-semibold text-accent-foreground">
          Ver mis productos
        </Link>
      </div>
    );
  }

  const state = imported.error ? imported : preview;
  const rows = state.preview?.rows ?? [];
  const okRows = rows.filter((r) => r.errors.length === 0);
  const badRows = rows.length - okRows.length;

  return (
    <div className="flex flex-col gap-6">
      <form action={runPreview} className="flex flex-col gap-3">
        <label htmlFor={`${id}-text`} className="text-[15px] font-semibold">
          Pegá acá las celdas de tu planilla
        </label>
        <p id={`${id}-help`} className="text-[14px] text-muted">
          Columnas en este orden: <strong>categoría</strong>, <strong>nombre</strong>, <strong>descripción</strong> y <strong>precio</strong>. La descripción puede quedar vacía. Si la primera fila tiene los títulos, la salteamos.
        </p>
        <textarea
          id={`${id}-text`}
          name="text"
          required
          rows={8}
          defaultValue={state.text}
          aria-describedby={`${id}-help`}
          placeholder={"Hamburguesas\tHamburguesa doble\tDoble carne y cheddar\t9000\nBebidas\tGaseosa 500 ml\t\t2000"}
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 font-mono text-[14px]"
        />
        <button
          type="submit"
          disabled={previewing}
          className="min-h-12 w-fit rounded-full border border-line px-6 text-[16px] font-semibold hover:border-foreground disabled:opacity-60"
        >
          {previewing ? "Revisando…" : "Revisar"}
        </button>
      </form>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[15px] font-semibold text-danger">
          {state.error}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <section aria-labelledby={`${id}-preview`} className="flex flex-col gap-3">
          <h2 id={`${id}-preview`} className="font-display text-[22px]">
            Vista previa
          </h2>
          <p className="text-[15px]">
            {okRows.length} {okRows.length === 1 ? "producto listo" : "productos listos"}
            {badRows > 0 ? <span className="font-semibold text-danger"> · {badRows} con errores (no se importan)</span> : null}
            {state.preview?.tooMany ? <span className="text-muted"> · solo se leen las primeras 300 filas</span> : null}
          </p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-surface-muted text-[13px] uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2">Fila</th>
                  <th scope="col" className="px-3 py-2">Categoría</th>
                  <th scope="col" className="px-3 py-2">Nombre</th>
                  <th scope="col" className="px-3 py-2 text-right">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.line} className={row.errors.length ? "bg-danger-soft" : ""}>
                    <td className="px-3 py-2 tabular-nums text-muted">{row.line}</td>
                    <td className="px-3 py-2">{row.category ?? <span className="text-muted">Sin categoría</span>}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold">{row.name || "—"}</span>
                      {row.errors.map((e) => (
                        <span key={e} className="block text-[13px] font-semibold text-danger">
                          {e}
                        </span>
                      ))}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.price !== null ? formatCents(row.price) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={runImport}>
            <input type="hidden" name="text" value={state.text ?? ""} />
            <button
              type="submit"
              disabled={importing || okRows.length === 0}
              className="min-h-12 w-full rounded-full bg-accent px-6 text-[16px] font-semibold text-accent-foreground disabled:opacity-60 sm:w-fit"
            >
              {importing ? "Importando…" : `Importar ${okRows.length} ${okRows.length === 1 ? "producto" : "productos"}`}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
