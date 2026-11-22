"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PublicProduct } from "@/modules/catalog/public-queries";
import { CloseIcon } from "./icons";
import { PriceBlock, ProductPicture, TagList } from "./product-card";

const HISTORY_KEY = "vidriFicha";

/**
 * Ficha del producto: sube desde abajo en el celular (deja ver un borde del catálogo) y es
 * una ventana centrada en pantallas grandes. Fotos para pasar con el dedo, precio,
 * descripción completa, características y el botón "Agregar · $ …".
 *
 * Al abrirla se suma un paso al historial: "Atrás" del celular la cierra sin salir del
 * catálogo. La X, Escape y tocar afuera vuelven ese paso atrás.
 */
export function ProductSheet({
  product,
  currency,
  action,
  onClose,
}: {
  product: PublicProduct;
  currency: string;
  action?: ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    window.history.pushState({ [HISTORY_KEY]: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      dialog?.close();
    };
  }, [onClose]);

  const requestClose = () => {
    if (window.history.state?.[HISTORY_KEY]) window.history.back();
    else onClose();
  };

  const titleId = `ficha-${product.id}`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-surface p-0 text-foreground backdrop:bg-black/50 sm:m-auto sm:max-h-[90dvh] sm:max-w-lg sm:rounded-3xl"
    >
      <div className="relative">
        {product.images.length > 1 ? (
          <>
            <div
              className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={(e) => {
                const el = e.currentTarget;
                setPhoto(Math.round(el.scrollLeft / el.clientWidth));
              }}
            >
              {product.images.map((image, i) => (
                <div key={image.path} className="w-full shrink-0 snap-center">
                  <ProductPicture product={product} index={i} sizes={1280} className="aspect-square w-full" />
                </div>
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
              {product.images.map((image, i) => (
                <span key={image.path} className={`size-2 rounded-full ${i === photo ? "bg-white" : "bg-white/50"}`} />
              ))}
            </div>
            <p className="sr-only" aria-live="polite">
              Foto {photo + 1} de {product.images.length}
            </p>
          </>
        ) : (
          <ProductPicture product={product} sizes={1280} className="aspect-[4/3] w-full sm:aspect-square" />
        )}
        <button
          type="button"
          onClick={requestClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-surface/90 text-foreground shadow"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-5 pt-5 pb-4">
        <div className="flex flex-col gap-2">
          <TagList product={product} />
          <h2 id={titleId} className="font-display text-[24px] leading-tight text-balance">
            {product.name}
          </h2>
          <PriceBlock product={product} currency={currency} large />
        </div>
        {product.description ? <p className="text-[15px] whitespace-pre-line text-muted">{product.description}</p> : null}
        {product.specs.length > 0 ? (
          <dl className="divide-y divide-line border-y border-line text-[15px]">
            {product.specs.map((spec) => (
              <div key={spec.label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">{spec.label}</dt>
                <dd className="text-right font-semibold">{spec.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <div className="sticky bottom-0 border-t border-line bg-surface px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        {product.isAvailable ? (
          action
        ) : (
          <p className="py-2 text-center font-semibold text-danger">Sin stock por ahora</p>
        )}
      </div>
    </dialog>
  );
}
