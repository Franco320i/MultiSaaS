"use client";

import Image from "next/image";
import { buttonClasses } from "@/ui/button-classes";
import { useActionState, useId, useRef, useState } from "react";
import { ACCEPT_ATTRIBUTE, ResizeError, resizeForUpload } from "@/ui/resize-image";
import type { SettingsFormState } from "../actions";
import { BRAND_PALETTE } from "../schemas";
import { Field, inputClass, SettingsForm } from "./fields";

/** Paso "Tu marca": nombre visible, frase, descripción, color, logo y portada. */
export function BrandForm({
  action,
  next,
  submitLabel,
  values,
}: {
  action: (prev: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  next?: string;
  submitLabel: string;
  values: { display_name: string; tagline: string | null; description: string | null; brand: string };
}) {
  const id = useId();
  return (
    <SettingsForm action={action} next={next} submitLabel={submitLabel}>
      {(fields) => (
        <>
          <Field id={`${id}-name`} label="Nombre que ven tus clientes">
            <input id={`${id}-name`} name="display_name" required maxLength={80} defaultValue={fields?.display_name ?? values.display_name} className={inputClass} />
          </Field>
          <Field id={`${id}-tagline`} label="Frase corta" optional hint="Aparece debajo del nombre. Por ejemplo, Hamburguesas a la parrilla.">
            <input id={`${id}-tagline`} name="tagline" maxLength={120} defaultValue={fields?.tagline ?? values.tagline ?? ""} className={inputClass} />
          </Field>
          <Field id={`${id}-description`} label="Sobre tu comercio" optional hint="Aparece al pie del catálogo.">
            <textarea
              id={`${id}-description`}
              name="description"
              maxLength={500}
              rows={3}
              defaultValue={fields?.description ?? values.description ?? ""}
              className={`${inputClass} py-3`}
            />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-[15px] font-semibold">Color de tu marca</legend>
            <div className="flex flex-wrap gap-3">
              {BRAND_PALETTE.map((color) => (
                <label key={color} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="brand"
                    value={color}
                    defaultChecked={(fields?.brand ?? values.brand) === color}
                    className="peer sr-only"
                    aria-label={`Color ${color}`}
                  />
                  <span
                    aria-hidden
                    style={{ backgroundColor: color }}
                    className="block size-11 rounded-full ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
                  />
                </label>
              ))}
            </div>
            <p className="text-[14px] text-muted">Se usa en la portada, en los botones y en la barra del pedido.</p>
          </fieldset>
        </>
      )}
    </SettingsForm>
  );
}

/** Subir o quitar el logo o la portada. Se achica en el navegador y el servidor lo re-procesa. */
export function BrandingImage({
  kind,
  label,
  hint,
  url,
  uploadAction,
  removeAction,
}: {
  kind: "logo" | "cover";
  label: string;
  hint: string;
  url: string | null;
  uploadAction: (prev: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  removeAction: () => Promise<SettingsFormState>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, upload, pending] = useActionState(uploadAction, {});
  const [removing, setRemoving] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const blob = await resizeForUpload(file);
      const data = new FormData();
      data.set("file", blob, `${kind}.webp`);
      upload(data);
    } catch (e) {
      setError(e instanceof ResizeError ? e.message : "No pudimos preparar la imagen. Probá con otra.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const message = error ?? state.error;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[15px] font-semibold">{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        {url ? (
          <Image
            src={url}
            alt={label}
            width={kind === "logo" ? 72 : 160}
            height={72}
            unoptimized
            className={`h-18 bg-surface-muted object-cover ${kind === "logo" ? "w-18 rounded-full" : "w-40 rounded-xl"}`}
          />
        ) : (
          <div aria-hidden className={`grid h-18 place-items-center bg-surface-muted text-[13px] text-muted ${kind === "logo" ? "w-18 rounded-full" : "w-40 rounded-xl"}`}>
            Sin imagen
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <label className={buttonClasses("secondary", "md", "w-fit cursor-pointer")}>
            {pending ? "Subiendo…" : url ? "Cambiar" : "Subir imagen"}
            <input ref={inputRef} type="file" accept={ACCEPT_ATTRIBUTE} className="sr-only" disabled={pending} onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {url ? (
            <button
              type="button"
              disabled={removing}
              onClick={async () => {
                setRemoving(true);
                const result = await removeAction();
                setRemoving(false);
                if (result.error) setError(result.error);
              }}
              className="min-h-11 px-3 text-[15px] font-semibold text-muted hover:text-danger"
            >
              Quitar
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-[14px] text-muted">{hint}</p>
      {message ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}
