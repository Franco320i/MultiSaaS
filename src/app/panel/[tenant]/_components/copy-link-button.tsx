"use client";

import { useToast } from "@/ui/toast";

/** Copia el link del catálogo. Si el celular no deja usar el portapapeles, avisa cómo hacerlo a mano. */
export function CopyLinkButton({ url, className }: { url: string; className: string }) {
  const { show } = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        // Sin portapapeles (http, navegadores dentro de otras apps) o sin permiso: avisar igual.
        try {
          await navigator.clipboard.writeText(url);
          show("Link copiado");
        } catch {
          show("No se pudo copiar: mantené apretado el link para copiarlo", "error");
        }
      }}
      className={className}
    >
      Copiar link
    </button>
  );
}
