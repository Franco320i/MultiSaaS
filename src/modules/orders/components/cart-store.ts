"use client";

import { useSyncExternalStore } from "react";
import { addLine, parseCartV1, parseCartV2, setLineQuantity, type CartLine } from "../cart-lines";

/**
 * Carrito del catálogo (diseño, sección 11, paso 1). Vive en localStorage del
 * navegador: cada comercio es un origen distinto (alfa.… y beta.…), así que los
 * carritos quedan separados por el propio navegador.
 *
 * Una línea por producto + combinación de opciones (parte 3). Solo IDs y cantidades:
 * nombres y precios se toman del catálogo actual y el servidor los vuelve a calcular.
 * (Este estado es del navegador del comprador, no del servidor: la regla de "nada de
 * variables globales" no aplica acá.)
 *
 * pedido:v2 reemplaza a pedido:v1 (sin opciones): lo guardado ahí se convierte una vez.
 */

export type { CartLine };

const KEY = "pedido:v2";
const OLD_KEY = "pedido:v1";
const EMPTY: CartLine[] = [];

let lines: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  try {
    const current = window.localStorage.getItem(KEY);
    if (current !== null) return parseCartV2(JSON.parse(current));
    const old = window.localStorage.getItem(OLD_KEY);
    if (old === null) return [];
    const converted = parseCartV1(JSON.parse(old));
    window.localStorage.setItem(KEY, JSON.stringify(converted));
    window.localStorage.removeItem(OLD_KEY);
    return converted;
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

/** Suma una unidad de esa combinación (o la crea). */
export function addToCart(productId: string, optionIds: string[] = []) {
  write(addLine(snapshot(), productId, optionIds));
}

/** Cambia la cantidad de una línea por su clave (lineKey). 0 la saca. */
export function setQuantity(key: string, quantity: number) {
  write(setLineQuantity(snapshot(), key, quantity));
}

export function removeProducts(productIds: string[]) {
  const drop = new Set(productIds);
  write(snapshot().filter((l) => !drop.has(l.productId)));
}

export function clearCart() {
  write([]);
}
