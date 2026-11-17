"use client";

import { setQuantity, useCart } from "./cart-store";

/** "Agregar" o, si ya está en el pedido, − cantidad +. Objetivos táctiles de 44 px. */
export function AddToCartButton({ productId, name }: { productId: string; name: string }) {
  const quantity = useCart().find((l) => l.productId === productId)?.quantity ?? 0;

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => setQuantity(productId, 1)}
        aria-label={`Agregar ${name} al pedido`}
        className="min-h-11 rounded-full border border-brand px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
      >
        Agregar
      </button>
    );
  }

  return <Stepper productId={productId} name={name} quantity={quantity} />;
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
