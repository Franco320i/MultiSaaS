"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { slugify } from "@/lib/slugify";
import { provisionAssistedAction, type AssistedState } from "@/app/admin/(panel)/actions";
import { adminInput } from "@/app/admin/(panel)/admin-form";

/** Alta asistida: datos del comercio y email del dueño, que recibe la invitación. */
export function AssistedForm({ templates, domainSuffix }: { templates: { key: string; name: string }[]; domainSuffix: string }) {
  const id = useId();
  const [state, action, pending] = useActionState<AssistedState, FormData>(provisionAssistedAction, {});
  const [name, setName] = useState(state.fields?.name ?? "");
  const [slug, setSlug] = useState(state.fields?.slug ?? "");
  const [touched, setTouched] = useState(false);
  const effectiveSlug = touched ? slug : slugify(name, 40).replace(/^item$/, "");
  const label = "flex flex-col gap-1 text-[13px] font-semibold text-muted";

  if (state.tenantId) {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-surface p-5">
        <p className="font-semibold text-accent">{state.saved}</p>
        <p className="text-[14px] text-muted">El comercio quedó en prueba por 14 días. Podés cargar su marca y sus productos desde su ficha.</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/comercios/${state.tenantId}`} className="admin-btn flex min-h-10 items-center rounded-[10px] bg-accent px-4 text-[14px] font-semibold text-accent-foreground">
            Ver la ficha
          </Link>
          <a href="/alta" className="admin-btn flex min-h-10 items-center rounded-[10px] border border-line px-4 text-[14px] font-semibold">
            Dar de alta otro
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <label className={label} htmlFor={`${id}-email`}>
        Email del dueño
        <input id={`${id}-email`} name="ownerEmail" type="email" required defaultValue={state.fields?.ownerEmail} className={adminInput} />
      </label>
      <label className={label} htmlFor={`${id}-name`}>
        Nombre del comercio
        <input id={`${id}-name`} name="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={adminInput} />
      </label>
      <label className={label} htmlFor={`${id}-slug`}>
        Dirección
        <span className="flex items-center rounded-[10px] border border-line bg-background pr-3 focus-within:border-accent">
          <input
            id={`${id}-slug`}
            name="slug"
            required
            maxLength={40}
            value={effectiveSlug}
            onChange={(e) => {
              setTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
            }}
            className="min-h-10 min-w-0 flex-1 bg-transparent px-3 font-mono text-[14px] text-foreground outline-none"
          />
          <span className="font-mono text-[13px] text-muted">.{domainSuffix}</span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label} htmlFor={`${id}-type`}>
          Rubro
          <select id={`${id}-type`} name="businessType" defaultValue={state.fields?.businessType ?? templates[0]?.key} className={adminInput}>
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label} htmlFor={`${id}-whatsapp`}>
          WhatsApp del comercio
          <input
            id={`${id}-whatsapp`}
            name="whatsappPhone"
            type="tel"
            required
            defaultValue={state.fields?.whatsappPhone ?? "+54 9 "}
            className={`${adminInput} font-mono`}
          />
        </label>
      </div>
      {state.error ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="admin-btn min-h-10 w-fit rounded-[10px] bg-accent px-4 text-[14px] font-semibold text-accent-foreground disabled:opacity-60">
        {pending ? "Creando…" : "Crear comercio e invitar al dueño"}
      </button>
    </form>
  );
}
