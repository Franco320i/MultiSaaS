"use client";

import { useState } from "react";
import { MAX_SPECS, SPEC_LABEL_MAX, SPEC_VALUE_MAX, type ProductSpec } from "@/lib/catalog-options";

/**
 * Características del producto ("Material · Lino"): filas que se agregan y se quitan.
 * Se envían como pares spec_label / spec_value en orden (productFormFromData los junta).
 */
export function SpecsEditor({ initial }: { initial: ProductSpec[] }) {
  const [rows, setRows] = useState<{ key: number; label: string; value: string }[]>(() =>
    initial.map((spec, i) => ({ key: i, ...spec })),
  );
  const [nextKey, setNextKey] = useState(initial.length);

  const add = () => {
    setRows((current) => [...current, { key: nextKey, label: "", value: "" }]);
    setNextKey((k) => k + 1);
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-medium">
        Características <span className="font-normal opacity-70">(opcional)</span>
      </legend>
      <p className="text-sm opacity-70">Aparecen en la ficha del producto. Por ejemplo: Material · Lino, Capacidad · 256 GB.</p>
      {rows.map((row, i) => (
        <div key={row.key} className="flex flex-wrap items-center gap-2">
          <input
            name="spec_label"
            aria-label={`Nombre de la característica ${i + 1}`}
            placeholder="Material"
            maxLength={SPEC_LABEL_MAX}
            defaultValue={row.label}
            className="min-h-11 min-w-0 flex-1 basis-32 rounded-md border border-foreground/20 bg-transparent px-3"
          />
          <input
            name="spec_value"
            aria-label={`Valor de la característica ${i + 1}`}
            placeholder="Lino"
            maxLength={SPEC_VALUE_MAX}
            defaultValue={row.value}
            className="min-h-11 min-w-0 flex-[2] basis-40 rounded-md border border-foreground/20 bg-transparent px-3"
          />
          <button
            type="button"
            onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
            className="min-h-11 px-3 text-sm underline underline-offset-4"
            aria-label={`Quitar la característica ${i + 1}`}
          >
            Quitar
          </button>
        </div>
      ))}
      {rows.length < MAX_SPECS ? (
        <button type="button" onClick={add} className="min-h-11 w-fit text-sm font-medium underline underline-offset-4">
          Agregar característica
        </button>
      ) : (
        <p className="text-sm opacity-70">Llegaste al máximo de {MAX_SPECS} características.</p>
      )}
    </fieldset>
  );
}
