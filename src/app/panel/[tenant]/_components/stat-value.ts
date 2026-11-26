/**
 * Tamaño de letra de un número del Inicio. Los montos usan espacio duro ("$ 1.234.567"),
 * así que no se cortan en dos líneas: a partir de 10 caracteres bajan un tamaño para entrar
 * en una celda de 320 px. Los nombres (el más pedido) van chicos.
 */
export type StatValueSize = "large" | "medium" | "small";

export function statValueSize(value: string, kind: "number" | "text" = "number"): StatValueSize {
  if (kind === "text") return "small";
  return value.length >= 10 ? "medium" : "large";
}
