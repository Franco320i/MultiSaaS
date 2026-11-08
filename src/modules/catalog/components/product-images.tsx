"use client";

import Image from "next/image";
import { startTransition, useActionState, useRef, useState } from "react";
import { FormError } from "@/ui/form";
import type { FormState } from "../actions";
import { ACCEPT_ATTRIBUTE, ResizeError, resizeForUpload } from "./resize-image";

export type ImageItem = { id: string; url: string; width: number; height: number };

/**
 * Fotos de un producto: subir, ordenar y borrar. La primera es la que se muestra
 * en los listados y en el catálogo. Todas las acciones vuelven a verificar el acceso
 * en el servidor.
 */
export function ProductImages({
  productName,
  images,
  uploadAction,
  deleteAction,
  moveAction,
}: {
  productName: string;
  images: ImageItem[];
  uploadAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  deleteAction: (imageId: string) => Promise<void>;
  moveAction: (imageId: string, direction: "up" | "down") => Promise<void>;
}) {
  const [state, upload, uploading] = useActionState(uploadAction, {});
  const [preparing, setPreparing] = useState(false);
  const [clientError, setClientError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = preparing || uploading;

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    setClientError(undefined);
    setPreparing(true);
    try {
      const blob = await resizeForUpload(file);
      const formData = new FormData();
      formData.append("file", blob, "foto");
      startTransition(() => upload(formData));
    } catch (error) {
      setClientError(error instanceof ResizeError ? error.message : "No pudimos preparar la foto. Probá con otra.");
    } finally {
      setPreparing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Fotos</h2>
        <span className="text-sm opacity-60">{images.length === 0 ? "Sin fotos" : `${images.length} cargadas`}</span>
      </div>

      {images.length === 0 ? (
        <p className="text-sm opacity-70">
          Los productos con foto se venden más. La primera foto es la que se ve en el catálogo.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.id} className="flex flex-col gap-2">
              <div className="relative aspect-square overflow-hidden rounded-md bg-foreground/5">
                <Image
                  src={image.url}
                  alt={index === 0 ? `${productName} (foto principal)` : `${productName}, foto ${index + 1}`}
                  fill
                  sizes="(min-width: 640px) 200px, 50vw"
                  unoptimized
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium">
                    Principal
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => startTransition(() => moveAction(image.id, "up"))}
                    aria-label={`Mover la foto ${index + 1} hacia adelante`}
                    className="min-h-11 min-w-11 rounded-md border border-foreground/15 disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={index === images.length - 1}
                    onClick={() => startTransition(() => moveAction(image.id, "down"))}
                    aria-label={`Mover la foto ${index + 1} hacia atrás`}
                    className="min-h-11 min-w-11 rounded-md border border-foreground/15 disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Borrar esta foto?")) startTransition(() => deleteAction(image.id));
                  }}
                  aria-label={`Borrar la foto ${index + 1}`}
                  className="min-h-11 px-2 text-red-700 underline dark:text-red-300"
                >
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormError message={clientError ?? state.error} />

      <div>
        <label
          className={`inline-flex min-h-11 cursor-pointer items-center rounded-md border border-foreground/20 px-4 text-sm font-medium ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          {preparing ? "Preparando la foto…" : uploading ? "Subiendo…" : "Agregar foto"}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            disabled={busy}
            onChange={(event) => onFileChosen(event.target.files?.[0])}
          />
        </label>
        <p className="mt-1 text-xs opacity-60">JPG, PNG o WebP. Se achica y optimiza automáticamente.</p>
      </div>
    </section>
  );
}
