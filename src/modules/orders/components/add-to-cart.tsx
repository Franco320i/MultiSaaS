"use client";

import { setQuantity, useCart } from "./cart-store";

/**
 * "Agregar" o, si ya está en el pedido, − cantidad +. Objetivos táctiles de 44 px.
 * - `card`: ocupa el ancho de la tarjeta de la grilla.
 * - `sheet`: botón principal de la ficha, con el precio ("Agregar · $ 9.000").
 */
export function AddToCartButton({
  productId,
  name,
  variant = "card",
  priceLabel,
}: {
  productId: string;
  name: string;
  variant?: "card" | "sheet";
  priceLabel?: string;
}) {
  const quantity = useCart().find((l) => l.productId === productId)?.quantity ?? 0;

  if (quantity === 0) {
    return variant === "sheet" ? (
      <button
        type="button"
        onClick={() => setQuantity(productId, 1)}
        aria-label={`Agregar ${name} al pedido`}
        className="min-h-12 w-full rounded-full bg-brand px-5 text-[16px] font-semibold text-brand-foreground tabular-nums"
      >
        {priceLabel ? `Agregar · ${priceLabel}` : "Agregar"}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setQuantity(productId, 1)}
        aria-label={`Agregar ${name} al pedido`}
        className="min-h-11 w-full rounded-full border border-brand px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
      >
        Agregar
      </button>
    );
  }

  return (
    <div className={variant === "sheet" ? "flex items-center justify-between gap-3" : undefined}>
      {variant === "sheet" ? <span className="font-semibold">En tu pedido</span> : null}
      <Stepper productId={productId} name={name} quantity={quantity} />
    </div>
  );
}

export function Stepper({ productId, name, quantity }: { productId: string; name: string; quantity: number }) {
  return (
    <div role="group" aria-label={`Cantidad de ${name}`} className="inline-flex items-center rounded-full bg-brand text-brand-foreground">
      <button
        type="button"
        onClick={() => setQuantity(productId, quantity - 1)}
        aria-label={quantity === 1 ? `Sacar ${name} del pedido` : `Uno menos de ${name}`}
        className="grid size-11 place-items-center rounded-full text-[20px] font-semibold"
      >
        −
      </button>
      <span aria-live="polite" className="min-w-6 text-center text-[15px] font-semibold tabular-nums">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity(productId, quantity + 1)}
        disabled={quantity >= 99}
        aria-label={`Uno más de ${name}`}
        className="grid size-11 place-items-center rounded-full text-[20px] font-semibold disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
