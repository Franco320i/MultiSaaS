"use client";

import { createContext, useContext } from "react";

/**
 * Lo que eligió el cliente en la ficha (parte 3). Lo provee la ficha del catálogo y lo lee
 * el botón "Agregar" del módulo pedidos: así los dos módulos se hablan sin importarse.
 * - optionIds: opciones elegidas.
 * - priceLabel: precio de la combinación, ya con formato ("$ 10.300").
 * - blocked: por qué no se puede agregar todavía ("Elegí un tamaño"), o null.
 * - onAdded: avisa a la ficha que se agregó (para mostrar "Agregado").
 */
export type OptionSelection = {
  optionIds: string[];
  priceLabel: string;
  blocked: string | null;
  onAdded: () => void;
};

const OptionSelectionContext = createContext<OptionSelection | null>(null);

export const OptionSelectionProvider = OptionSelectionContext.Provider;

export function useOptionSelection(): OptionSelection | null {
  return useContext(OptionSelectionContext);
}
