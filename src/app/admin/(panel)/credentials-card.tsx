"use client";

import { useState } from "react";
import type { OwnerCredentials } from "./actions";

/**
 * Datos de acceso del dueño para mandarle por WhatsApp (alta asistida y "Nueva
 * contraseña"). La contraseña se ve una sola vez: no se guarda en ningún lado.
 */
export function CredentialsCard({ credentials }: { credentials: OwnerCredentials }) {
  const [copied, setCopied] = useState<"ok" | "error" | null>(null);
  const text = [
    `Tu panel: ${credentials.panelUrl}`,
    `Correo: ${credentials.email}`,
    ...(credentials.password ? [`Contraseña: ${credentials.password}`, "Cuando entres, cambiala en Mi local → Tu contraseña."] : []),
  ].join("\n");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-background p-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
        <dt className="text-muted">Panel</dt>
        <dd className="font-mono break-all">{credentials.panelUrl}</dd>
        <dt className="text-muted">Correo</dt>
        <dd className="font-mono break-all">{credentials.email}</dd>
        {credentials.password ? (
          <>
            <dt className="text-muted">Contraseña</dt>
            <dd className="font-mono text-[16px] font-semibold tracking-wide">{credentials.password}</dd>
          </>
        ) : null}
      </dl>
      {credentials.password ? (
        <p className="text-[13px] text-warning">Copiala ahora: después no se puede volver a ver. Si se pierde, generá otra desde la ficha.</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied("ok");
            } catch {
              setCopied("error");
            }
          }}
          className="admin-btn min-h-10 rounded-[10px] bg-accent px-4 text-[14px] font-semibold text-accent-foreground"
        >
          Copiar para WhatsApp
        </button>
        <span aria-live="polite" className="text-[13px] text-muted">
          {copied === "ok" ? "Copiado. Pegalo en el chat con el dueño." : copied === "error" ? "No se pudo copiar: seleccioná el texto a mano." : ""}
        </span>
      </div>
    </div>
  );
}
