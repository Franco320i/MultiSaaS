"use client";

import { useToast } from "@/ui/toast";

/** Copia el link del catálogo. Si el celular no deja usar el portapapeles, avisa cómo hacerlo a mano. */
export function CopyLinkButton({ url, className }: { url: string; className: string }) {
  const { show } = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(url).then(
          () => show("Link copiado"),
          () => show("No se pudo copiar: mantené apretado el link para copiarlo", "error"),
        );
      }}
      className={className}
    >
      Copiar link
    </button>
  );
}
