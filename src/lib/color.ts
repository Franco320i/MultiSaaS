/**
 * Colores del comercio en el catálogo (docs/design/sistema-visual.md).
 * El color de marca llega de la base (jsonb): se valida acá antes de ponerlo en CSS.
 */

const HEX = /^#[0-9a-f]{6}$/i;

/** Devuelve el color en minúsculas si es `#rrggbb` válido; si no, null. */
export function parseHexColor(value: unknown): string | null {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : null;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Relación de contraste WCAG entre dos colores `#rrggbb`. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const INK = "#1a1c18";
export const WHITE = "#ffffff";

/** Texto legible sobre un fondo: blanco si cumple AA (4,5:1), si no, tinta oscura. */
export function readableTextOn(background: string): string {
  return contrastRatio(background, WHITE) >= 4.5 ? WHITE : INK;
}
