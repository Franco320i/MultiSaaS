"use client";

import { formatCents } from "@/lib/money";
import type { ProductOptionGroup } from "@/lib/product-options";

/**
 * Grupos de opciones en la ficha: botones tocables (nunca listas desplegables).
 * Grupo de una: elegir otra reemplaza. Grupo de varias: se suman hasta el máximo.
 * Agotadas: tachadas y sin poder elegirse.
 */
export function OptionPicker({
  groups,
  selected,
  onChange,
  currency,
}: {
  groups: ProductOptionGroup[];
  selected: string[];
  onChange: (next: string[]) => void;
  currency: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const ids = group.options.map((o) => o.id);
        const chosen = selected.filter((id) => ids.includes(id));
        const full = group.maxChoices > 1 && chosen.length >= group.maxChoices;
        const hint = group.required
          ? group.maxChoices === 1
            ? "Elegí 1"
            : `Elegí hasta ${group.maxChoices}`
          : group.maxChoices === 1
            ? "Opcional"
            : `Opcional · hasta ${group.maxChoices}`;

        const toggle = (id: string) => {
          const isOn = selected.includes(id);
          if (group.maxChoices === 1) {
            const others = selected.filter((s) => !ids.includes(s));
            onChange(isOn && !group.required ? others : [...others, id]);
          } else if (isOn) {
            onChange(selected.filter((s) => s !== id));
          } else if (!full) {
            onChange([...selected, id]);
          }
        };

        return (
          <fieldset key={group.id} className="flex flex-col gap-2">
            <legend className="mb-1 flex w-full items-baseline justify-between gap-3">
              <span className="text-[16px] font-semibold">{group.name}</span>
              <span className={`text-[13px] ${group.required && chosen.length === 0 ? "font-semibold text-foreground" : "text-muted"}`}>
                {hint}
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const isOn = selected.includes(option.id);
                const disabled = !option.isAvailable || (!isOn && full);
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isOn}
                    aria-label={`${group.name}: ${option.name}${option.priceDelta > 0 ? `, suma ${formatCents(option.priceDelta, currency)}` : ""}${option.isAvailable ? "" : ", agotado"}`}
                    disabled={disabled}
                    onClick={() => toggle(option.id)}
                    className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[15px] transition-colors ${
                      isOn
                        ? "border-brand bg-brand font-semibold text-brand-foreground"
                        : "border-line bg-surface text-foreground hover:border-brand"
                    } disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    <span className={option.isAvailable ? undefined : "line-through"}>{option.name}</span>
                    {option.priceDelta > 0 ? (
                      <span className={`text-[13px] tabular-nums ${isOn ? "" : "text-muted"}`}>+{formatCents(option.priceDelta, currency)}</span>
                    ) : null}
                    {!option.isAvailable ? <span className="text-[12px]">Agotado</span> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
