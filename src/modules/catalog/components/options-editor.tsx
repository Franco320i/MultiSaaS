"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { centsToInput, formatCents } from "@/lib/money";
import type { ProductOptionGroup } from "@/lib/product-options";
import { SubmitButton } from "@/ui/form";
import {
  createOptionAction,
  createOptionGroupAction,
  deleteOptionAction,
  deleteOptionGroupAction,
  moveOptionItemAction,
  setOptionAvailableAction,
  updateOptionAction,
  updateOptionGroupAction,
  type OptionFormState,
} from "../actions";

/**
 * Bloque "Opciones" del producto (parte 3): grupos (Talle, Tamaño, Extras) y sus opciones.
 * Cada cambio se guarda solo, sin el botón "Guardar cambios" del producto.
 */
export function OptionsEditor({ slug, productId, groups }: { slug: string; productId: string; groups: ProductOptionGroup[] }) {
  return (
    <section aria-labelledby="pf-opciones" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 id="pf-opciones" className="text-[16px] font-semibold">
          Opciones
        </h2>
        <p className="text-[14px] text-muted">
          Para que el cliente elija talle, tamaño o extras. Cada cambio se guarda solo.
        </p>
      </div>

      {groups.map((group, index) => (
        <GroupCard key={group.id} slug={slug} group={group} first={index === 0} last={index === groups.length - 1} />
      ))}

      {groups.length < 5 ? (
        <details className="group rounded-xl border border-dashed border-line" open={groups.length === 0 ? undefined : false}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center font-semibold text-accent [&::-webkit-details-marker]:hidden">
            + Agregar grupo de opciones
          </summary>
          <div className="border-t border-line p-3">
            <GroupForm action={createOptionGroupAction.bind(null, slug, productId)} submitLabel="Crear grupo" />
          </div>
        </details>
      ) : (
        <p className="text-[14px] text-muted">Llegaste al máximo de 5 grupos.</p>
      )}
    </section>
  );
}

function GroupCard({ slug, group, first, last }: { slug: string; group: ProductOptionGroup; first: boolean; last: boolean }) {
  const [editing, setEditing] = useState(false);
  const rule = `${group.required ? "Obligatorio" : "Opcional"} · ${group.maxChoices === 1 ? "se elige 1" : `hasta ${group.maxChoices}`}`;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-background p-3">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[16px] font-semibold">{group.name}</span>
          <span className="text-[13px] text-muted">{rule}</span>
        </div>
        <MoveButtons slug={slug} kind="group" id={group.id} label={group.name} first={first} last={last} />
      </div>

      {editing ? (
        <div className="flex flex-col gap-2 rounded-xl bg-surface p-3">
          <GroupForm
            action={updateOptionGroupAction.bind(null, slug, group.id)}
            submitLabel="Guardar grupo"
            initial={group}
            onSaved={() => setEditing(false)}
          />
          <form action={deleteOptionGroupAction.bind(null, slug, group.id)}>
            <button type="submit" className="min-h-11 text-[14px] font-semibold text-danger underline underline-offset-4">
              Borrar el grupo y sus opciones
            </button>
          </form>
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="min-h-10 w-fit text-[14px] font-semibold text-accent underline underline-offset-4">
          Editar grupo
        </button>
      )}

      <ul className="flex flex-col divide-y divide-line">
        {group.options.map((option, index) => (
          <OptionRow key={option.id} slug={slug} option={option} first={index === 0} last={index === group.options.length - 1} />
        ))}
      </ul>
      {group.options.length < 20 ? <NewOptionForm slug={slug} groupId={group.id} /> : null}
    </div>
  );
}

function GroupForm({
  action,
  submitLabel,
  initial,
  onSaved,
}: {
  action: (prev: OptionFormState, formData: FormData) => Promise<OptionFormState>;
  submitLabel: string;
  initial?: ProductOptionGroup;
  onSaved?: () => void;
}) {
  const [state, formAction] = useActionState(async (prev: OptionFormState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok) onSaved?.();
    return result;
  }, {});
  const [many, setMany] = useState((initial?.maxChoices ?? 1) > 1);

  return (
    <form action={formAction} key={state.ok ? "ok" : "form"} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-[15px]">
        <span className="font-semibold">Nombre del grupo</span>
        <input
          name="name"
          required
          maxLength={40}
          defaultValue={initial?.name ?? ""}
          placeholder="Ej.: Talle, Tamaño, Extras"
          className="min-h-12 rounded-xl border border-line bg-surface px-3 text-[16px] focus:border-accent focus:outline-none"
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[15px] font-semibold">¿Cuántas se eligen?</legend>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 has-[:checked]:border-accent has-[:checked]:bg-surface-muted has-[:checked]:font-semibold">
            <input type="radio" name="choice" value="one" defaultChecked={!many} onChange={() => setMany(false)} className="accent-[var(--accent)]" />
            Una sola
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 has-[:checked]:border-accent has-[:checked]:bg-surface-muted has-[:checked]:font-semibold">
            <input type="radio" name="choice" value="many" defaultChecked={many} onChange={() => setMany(true)} className="accent-[var(--accent)]" />
            Varias
          </label>
          {many ? (
            <label className="flex min-h-11 items-center gap-2 text-[15px]">
              hasta
              <input
                name="max_choices"
                type="number"
                min={2}
                max={20}
                defaultValue={Math.max(2, initial?.maxChoices ?? 3)}
                className="min-h-11 w-20 rounded-xl border border-line bg-surface px-3 text-[16px]"
              />
            </label>
          ) : null}
        </div>
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
        <input type="checkbox" name="required" defaultChecked={initial?.required ?? false} className="size-5 accent-[var(--accent)]" />
        <span>
          <span className="font-semibold">Obligatorio</span>
          <span className="block text-[14px] text-muted">El cliente no puede pedir sin elegir (por ejemplo, el talle).</span>
        </span>
      </label>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-[15px] text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

function OptionRow({
  slug,
  option,
  first,
  last,
}: {
  slug: string;
  option: ProductOptionGroup["options"][number];
  first: boolean;
  last: boolean;
}) {
  const [available, setAvailable] = useOptimistic(option.isAvailable);
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(async (prev: OptionFormState, formData: FormData) => {
    const result = await updateOptionAction(slug, option.id, prev, formData);
    if (result.ok) setEditing(false);
    return result;
  }, {});

  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setEditing((e) => !e)} className="flex min-w-0 flex-1 flex-col text-left" aria-expanded={editing}>
          <span className={`text-[15px] font-semibold ${available ? "" : "text-muted line-through"}`}>{option.name}</span>
          <span className="text-[13px] text-muted tabular-nums">
            {option.priceDelta > 0 ? `+${formatCents(option.priceDelta)}` : "Sin adicional"}
            {available ? "" : " · Agotada"}
          </span>
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={available}
          aria-label={`${option.name}: ${available ? "hay" : "agotada"}`}
          onClick={() =>
            startTransition(async () => {
              setAvailable(!available);
              await setOptionAvailableAction(slug, option.id, !available);
            })
          }
          className="flex min-h-11 shrink-0 flex-col items-center justify-center gap-0.5 px-1 text-[11px] text-muted"
        >
          <span className={`relative h-6 w-10 rounded-full transition-colors ${available ? "bg-accent" : "bg-line"}`}>
            <span className={`absolute top-1 size-4 rounded-full bg-white shadow transition-all ${available ? "left-5" : "left-1"}`} />
          </span>
          {available ? "Hay" : "No hay"}
        </button>
        <MoveButtons slug={slug} kind="option" id={option.id} label={option.name} first={first} last={last} />
      </div>
      {editing ? (
        <form action={formAction} className="flex flex-col gap-2 rounded-xl bg-surface p-3">
          <OptionFields name={option.name} price={option.priceDelta} />
          {state.error ? (
            <p role="alert" className="text-[14px] text-danger">
              {state.error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton>Guardar opción</SubmitButton>
            <button
              type="submit"
              formAction={deleteOptionAction.bind(null, slug, option.id)}
              className="min-h-11 text-[14px] font-semibold text-danger underline underline-offset-4"
            >
              Borrar opción
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

function NewOptionForm({ slug, groupId }: { slug: string; groupId: string }) {
  // Cada opción agregada vuelve a montar el formulario vacío para cargar la siguiente.
  const [added, setAdded] = useState(0);
  const [state, formAction] = useActionState(async (prev: OptionFormState, formData: FormData) => {
    const result = await createOptionAction(slug, groupId, prev, formData);
    if (result.ok) setAdded((n) => n + 1);
    return result;
  }, {});
  return (
    <form action={formAction} key={added} className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-3">
      <OptionFields name="" price={0} />
      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="min-h-11 w-fit rounded-full border border-accent px-4 text-[15px] font-semibold text-accent">
        + Agregar opción
      </button>
    </form>
  );
}

function OptionFields({ name, price }: { name: string; price: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
      <label className="flex flex-col gap-1 text-[14px]">
        <span className="font-semibold">Opción</span>
        <input
          name="name"
          required
          maxLength={40}
          defaultValue={name}
          placeholder="Ej.: M, Doble, Panceta"
          className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-[16px] focus:border-accent focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-[14px]">
        <span className="font-semibold">Suma ($)</span>
        <input
          name="price_delta"
          inputMode="decimal"
          defaultValue={price > 0 ? centsToInput(price) : ""}
          placeholder="0"
          className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-[16px] tabular-nums focus:border-accent focus:outline-none"
        />
      </label>
    </div>
  );
}

function MoveButtons({ slug, kind, id, label, first, last }: { slug: string; kind: "group" | "option"; id: string; label: string; first: boolean; last: boolean }) {
  return (
    <div className="flex gap-1">
      <form action={moveOptionItemAction.bind(null, slug, kind, id, "up")}>
        <button type="submit" disabled={first} aria-label={`Subir ${label}`} className="grid size-9 place-items-center rounded-lg border border-line text-[12px] disabled:opacity-30">
          ▲
        </button>
      </form>
      <form action={moveOptionItemAction.bind(null, slug, kind, id, "down")}>
        <button type="submit" disabled={last} aria-label={`Bajar ${label}`} className="grid size-9 place-items-center rounded-lg border border-line text-[12px] disabled:opacity-30">
          ▼
        </button>
      </form>
    </div>
  );
}
