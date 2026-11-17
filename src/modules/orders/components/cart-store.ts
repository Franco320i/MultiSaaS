"use client";

import { useSyncExternalStore } from "react";

/**
 * Carrito del catálogo (diseño, sección 11, paso 1). Vive en localStorage del
 * navegador: cada comercio es un origen distinto (alfa.… y beta.…), así que los
 * carritos quedan separados por el propio navegador.
 *
 * Solo guarda IDs y cantidades. Nombres y precios se toman del catálogo actual y el
 * servidor los vuelve a calcular al pedir. (Este estado es del navegador del
 * comprador, no del servidor: la regla de "nada de variables globales" no aplica acá.)
 */

export type CartLine = { productId: string; quantity: number };

const KEY = "pedido:v1";
const MAX_LINES = 50;
const MAX_QUANTITY = 99;
const EMPTY: CartLine[] = [];

let lines: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (l): l is CartLine =>
          typeof l?.productId === "string" &&
          Number.isInteger(l?.quantity) &&
          l.quantity >= 1 &&
          l.quantity <= MAX_QUANTITY,
      )
      .slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

function write(next: CartLine[]) {
  lines = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Modo privado o almacenamiento bloqueado: el carrito sigue en memoria.
  }
  for (const listener of listeners) listener();
}

function snapshot(): CartLine[] {
  if (lines === null) lines = read();
  return lines;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      lines = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function setQuantity(productId: string, quantity: number) {
  const current = snapshot();
  const q = Math.max(0, Math.min(MAX_QUANTITY, Math.round(quantity)));
  const exists = current.some((l) => l.productId === productId);
  if (q === 0) return write(current.filter((l) => l.productId !== productId));
  if (exists) return write(current.map((l) => (l.productId === productId ? { ...l, quantity: q } : l)));
  if (current.length >= MAX_LINES) return;
  write([...current, { productId, quantity: q }]);
}

export function removeProducts(productIds: string[]) {
  const drop = new Set(productIds);
  write(snapshot().filter((l) => !drop.has(l.productId)));
}

export function clearCart() {
  write([]);
}
