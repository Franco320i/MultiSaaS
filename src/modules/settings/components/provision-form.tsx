"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { slugify } from "@/lib/slugify";
import { checkSlugAction, provisionTenantAction, type SettingsFormState } from "../actions";
import type { BusinessTemplate } from "../queries";
import { Field, inputClass } from "./fields";

/**
 * Paso 1 del alta, "Tu comercio" (diseño, sección 10): nombre, dirección web con
 * verificación en vivo, rubro y WhatsApp. Al confirmar se crea el comercio completo.
 */
export function ProvisionForm({ templates, domainSuffix }: { templates: BusinessTemplate[]; domainSuffix: string }) {
  const id = useId();
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(provisionTenantAction, {});
  const [name, setName] = useState(state.fields?.name ?? "");
  const [slug, setSlug] = useState(state.fields?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(state.fields?.slug));
  const [check, setCheck] = useState<{ slug: string; available: boolean; reason?: string } | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(name, 40).replace(/^item$/, "");

  // Verificación en vivo (con una pausa corta para no consultar en cada tecla).
  useEffect(() => {
    if (effectiveSlug.length < 3) return;
    const timer = setTimeout(async () => {
      const result = await checkSlugAction(effectiveSlug);
      setCheck({ slug: effectiveSlug, ...result });
    }, 400);
    return () => clearTimeout(timer);
  }, [effectiveSlug]);

  const current = check?.slug === effectiveSlug ? check : null;
  const slugMessage =
    effectiveSlug.length < 3
      ? "De 3 a 40 letras, números o guiones."
      : !current
        ? "Revisando…"
        : current.available
          ? "Está libre."
          : current.reason === "invalid"
            ? "Usá solo letras, números o guiones, sin espacios ni acentos."
            : "Ya la usa otro comercio. Probá con otra.";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field id={`${id}-name`} label="Nombre del comercio">
        <input
          id={`${id}-name`}
          name="name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Por ejemplo, Burger del Centro"
          className={inputClass}
        />
      </Field>

      <Field id={`${id}-slug`} label="Dirección de tu catálogo">
        <div className="flex min-h-12 items-center rounded-xl border border-line bg-surface pr-4 focus-within:outline-2 focus-within:outline-accent">
          <input
            id={`${id}-slug`}
            name="slug"
            required
            maxLength={40}
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
            }}
            aria-describedby={`${id}-slug-status`}
            className="min-h-12 min-w-0 flex-1 rounded-xl bg-transparent px-4 text-[16px] outline-none"
          />
          <span className="shrink-0 text-[15px] text-muted">.{domainSuffix}</span>
        </div>
        <p
          id={`${id}-slug-status`}
          aria-live="polite"
          className={`text-[14px] ${current && !current.available ? "font-semibold text-danger" : current?.available ? "font-semibold text-accent" : "text-muted"}`}
        >
          {slugMessage}
        </p>
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[15px] font-semibold">Rubro</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {templates.map((template, index) => (
            <label key={template.key} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 has-[:checked]:border-accent has-[:checked]:ring-1 has-[:checked]:ring-accent">
              <input
                type="radio"
                name="businessType"
                value={template.key}
                required
                defaultChecked={state.fields?.businessType ? state.fields.businessType === template.key : index === 0}
                className="accent-[var(--accent)]"
              />
              <span className="text-[15px] font-semibold">{template.name}</span>
            </label>
          ))}
        </div>
        <p className="text-[14px] text-muted">Te armamos las primeras categorías según el rubro. Las podés cambiar.</p>
      </fieldset>

      <Field id={`${id}-whatsapp`} label="WhatsApp del comercio" hint="Ahí te llegan los pedidos. Con código de país, por ejemplo +54 9 2954 123456.">
        <input
          id={`${id}-whatsapp`}
          name="whatsappPhone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          defaultValue={state.fields?.whatsappPhone ?? "+54 9 "}
          className={inputClass}
        />
      </Field>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[15px] font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || (current !== null && !current.available)}
        className="min-h-12 rounded-full bg-accent px-6 text-[16px] font-semibold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Creando tu comercio…" : "Crear mi comercio"}
      </button>
    </form>
  );
}
