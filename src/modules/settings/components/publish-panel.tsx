"use client";

import { useState, useTransition } from "react";
import { buttonClasses } from "@/ui/button-classes";
import type { SettingsFormState } from "../actions";

/**
 * Publicar o despublicar el catálogo y, una vez publicado, compartirlo: link, código
 * QR (data URI SVG generado en el servidor) y botón para mandarlo por WhatsApp.
 */
export function PublishPanel({
  published,
  canPublish,
  catalogUrl,
  qrDataUri,
  displayName,
  action,
}: {
  published: boolean;
  canPublish: boolean;
  catalogUrl: string;
  qrDataUri: string;
  displayName: string;
  action: (published: boolean) => Promise<SettingsFormState>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);

  const run = (value: boolean) =>
    start(async () => {
      setError(null);
      const result = await action(value);
      if (result.error) setError(result.error);
      setConfirmUnpublish(false);
    });

  const shareText = `Mirá el catálogo de ${displayName} y hacé tu pedido: ${catalogUrl}`;

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[15px] font-semibold text-danger">
          {error}
        </p>
      ) : null}

      {published ? (
        <>
          <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5 sm:flex-row sm:items-center">
            {/* QR como imagen (data URI generado en el servidor): sin insertar HTML en la página. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUri}
              alt={`Código QR del catálogo: ${catalogUrl}`}
              width={160}
              height={160}
              className="size-40 shrink-0 self-center rounded-xl bg-white p-2"
            />
            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-[15px] text-muted">Tu catálogo está publicado en</p>
              <a href={catalogUrl} target="_blank" rel="noopener noreferrer" className="break-all font-display text-[22px] leading-tight underline underline-offset-4">
                {catalogUrl.replace(/^https?:\/\//, "")}
              </a>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses("whatsapp", "md", "w-fit")}
                >
                  Compartir por WhatsApp
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(catalogUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      setCopied(false);
                    }
                  }}
                  className={buttonClasses("secondary")}
                >
                  {copied ? "¡Copiado!" : "Copiar link"}
                </button>
              </div>
              <p className="text-[14px] text-muted">Ponelo en la bio de Instagram y en tu estado de WhatsApp. El QR lo podés imprimir para el mostrador.</p>
            </div>
          </div>
          {confirmUnpublish ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px]">¿Despublicar? Tus clientes van a ver “Catálogo no disponible”.</span>
              <button type="button" disabled={pending} onClick={() => run(false)} className={buttonClasses("danger")}>
                Sí, despublicar
              </button>
              <button type="button" onClick={() => setConfirmUnpublish(false)} className="min-h-11 px-3 text-[15px] font-semibold text-muted">
                No
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmUnpublish(true)} className="w-fit min-h-11 px-1 text-[15px] font-semibold text-muted hover:text-danger">
              Despublicar el catálogo
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-muted">
            Cuando publiques, tu catálogo va a estar en <span className="font-semibold text-foreground">{catalogUrl.replace(/^https?:\/\//, "")}</span>.
          </p>
          <button
            type="button"
            disabled={pending || !canPublish}
            onClick={() => run(true)}
            className={buttonClasses("primary", "md", "w-full sm:w-fit")}
          >
            {pending ? "Publicando…" : "Publicar mi catálogo"}
          </button>
        </div>
      )}
    </div>
  );
}
