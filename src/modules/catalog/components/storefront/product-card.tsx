"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { publicImageUrl } from "@/lib/images/url";
import { formatCents } from "@/lib/money";
import { fromPrice } from "@/lib/product-options";
import { savingsLabel, visibleTags } from "@/modules/catalog/presentation";
import type { PublicProduct } from "@/modules/catalog/public-queries";

/** Precio, el anterior tachado y "Ahorrás". */
export function PriceBlock({
  product,
  currency,
  large,
  price,
}: {
  product: PublicProduct;
  currency: string;
  large?: boolean;
  /** Precio a mostrar si no es el del producto (por ejemplo, con las opciones elegidas). */
  price?: number;
}) {
  const savings = savingsLabel(product.price, product.compareAtPrice, currency);
  // Con opciones que suman precio, la tarjeta muestra "Desde": lo más barato que se puede pedir.
  const addsPrice = product.optionGroups.some((g) => g.options.some((o) => o.priceDelta > 0));
  const shown = price ?? (addsPrice ? fromPrice(product.price, product.optionGroups) : product.price);
  return (
    <div className="flex flex-col">
      <p className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
        {price === undefined && addsPrice ? <span className="text-[13px] text-muted">Desde</span> : null}
        <span className={`text-brand dark:text-foreground ${large ? "text-[26px] font-bold" : "text-[16px] font-bold"}`}>
          {formatCents(shown, currency)}
        </span>
        {savings ? (
          <s className="text-[13px] text-muted">
            <span className="sr-only">Antes </span>
            {formatCents(product.compareAtPrice!, currency)}
          </s>
        ) : null}
      </p>
      {savings ? <span className="text-[13px] font-semibold text-accent">{savings}</span> : null}
    </div>
  );
}

export function TagList({ product }: { product: PublicProduct }) {
  const tags = visibleTags(product);
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <li
          key={tag}
          className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${
            tag === "Oferta" ? "bg-brand text-brand-foreground" : "bg-surface-muted text-foreground"
          }`}
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

/** Foto del producto o, sin foto, un bloque con el color de la marca y el nombre. */
export function ProductPicture({
  product,
  index = 0,
  sizes,
  className,
}: {
  product: PublicProduct;
  index?: number;
  sizes: 480 | 1280;
  className: string;
}) {
  const image = product.images[index];
  const dim = product.isAvailable ? "" : "opacity-50 grayscale";
  if (!image) {
    return (
      <div aria-hidden className={`flex items-end bg-brand p-3 text-brand-foreground ${className} ${dim}`}>
        <span className="line-clamp-3 font-display text-[18px] leading-tight">{product.name}</span>
      </div>
    );
  }
  return (
    <Image
      src={publicImageUrl(image.path, sizes)}
      alt={image.alt ?? product.name}
      width={sizes}
      height={sizes}
      unoptimized
      className={`bg-surface-muted object-cover ${className} ${dim}`}
    />
  );
}

/** Tarjeta de la grilla. Tocar la foto o el nombre abre la ficha; "Agregar" suma directo. */
export function ProductCard({
  product,
  currency,
  action,
  onOpen,
}: {
  product: PublicProduct;
  currency: string;
  action?: ReactNode;
  onOpen: () => void;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-2xl border border-black/5 bg-surface p-2 dark:border-line">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver ${product.name}`}
        className="relative block overflow-hidden rounded-[11px] text-left focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <ProductPicture product={product} sizes={480} className="aspect-[4/5] w-full" />
        {product.images.length > 1 ? (
          <span className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2 py-0.5 text-[12px] font-semibold text-white">
            {product.images.length} fotos
          </span>
        ) : null}
      </button>
      <TagList product={product} />
      <button type="button" onClick={onOpen} className="text-left">
        <h3 className={`text-[15px] leading-snug font-semibold ${product.isAvailable ? "" : "text-muted"}`}>{product.name}</h3>
      </button>
      <PriceBlock product={product} currency={currency} />
      {product.isAvailable ? (
        product.optionGroups.length > 0 ? (
          // Con opciones se elige en la ficha.
          <div className="mt-auto pt-1">
            <button
              type="button"
              onClick={onOpen}
              aria-label={`Elegir opciones de ${product.name}`}
              className="min-h-11 w-full rounded-full border border-brand px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
            >
              Elegir
            </button>
          </div>
        ) : action ? (
          <div className="mt-auto pt-1">{action}</div>
        ) : null
      ) : (
        <span className="w-fit rounded-full bg-danger-soft px-2 py-0.5 text-[13px] font-semibold text-danger">Sin stock</span>
      )}
    </li>
  );
}

/**
 * Fila de la Carta (rubros de comida, dietética y general): texto a la izquierda y la foto a
 * la derecha. Sin foto no queda un hueco: la fila es solo texto. Tocar el texto o la foto
 * abre la ficha; la acción (Agregar o − cantidad +) queda al lado del precio.
 */
export function ProductRow({
  product,
  currency,
  action,
  onOpen,
}: {
  product: PublicProduct;
  currency: string;
  action?: ReactNode;
  onOpen: () => void;
}) {
  const hasImage = product.images.length > 0;
  return (
    <li className="flex min-w-0 gap-3 rounded-[18px] border border-black/5 bg-surface p-3 dark:border-line">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <button type="button" onClick={onOpen} aria-label={`Ver ${product.name}`} className="text-left">
          <h3 className={`text-[16px] leading-snug font-bold ${product.isAvailable ? "" : "text-muted"}`}>{product.name}</h3>
          {product.description ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{product.description}</p>
          ) : null}
        </button>
        <TagList product={product} />
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
          <PriceBlock product={product} currency={currency} />
          {product.isAvailable ? (
            <div className="w-32 shrink-0">
              {product.optionGroups.length > 0 ? (
                <button
                  type="button"
                  onClick={onOpen}
                  aria-label={`Elegir opciones de ${product.name}`}
                  className="min-h-11 w-full rounded-full border border-brand px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
                >
                  Elegir
                </button>
              ) : (
                action
              )}
            </div>
          ) : (
            <span className="w-fit rounded-full bg-danger-soft px-2 py-0.5 text-[13px] font-semibold text-danger">Sin stock</span>
          )}
        </div>
      </div>
      {hasImage ? (
        <button
          type="button"
          onClick={onOpen}
          tabIndex={-1}
          aria-hidden
          className="relative h-[108px] w-24 shrink-0 overflow-hidden rounded-[13px] bg-brand-tint dark:bg-surface-muted"
        >
          <ProductPicture product={product} sizes={480} className="size-full" />
        </button>
      ) : null}
    </li>
  );
}
