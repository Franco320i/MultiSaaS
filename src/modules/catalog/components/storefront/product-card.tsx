"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { publicImageUrl } from "@/lib/images/url";
import { formatCents } from "@/lib/money";
import { savingsLabel, visibleTags } from "@/modules/catalog/presentation";
import type { PublicProduct } from "@/modules/catalog/public-queries";

/** Precio, el anterior tachado y "Ahorrás". */
export function PriceBlock({ product, currency, large }: { product: PublicProduct; currency: string; large?: boolean }) {
  const savings = savingsLabel(product.price, product.compareAtPrice, currency);
  return (
    <div className="flex flex-col">
      <p className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
        <span className={large ? "text-[26px] font-bold" : "text-[16px] font-semibold"}>{formatCents(product.price, currency)}</span>
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
    <li className="flex min-w-0 flex-col gap-2 rounded-2xl border border-line bg-surface p-2 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
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
        action ? <div className="mt-auto pt-1">{action}</div> : null
      ) : (
        <span className="w-fit rounded-full bg-danger-soft px-2 py-0.5 text-[13px] font-semibold text-danger">Sin stock</span>
      )}
    </li>
  );
}
