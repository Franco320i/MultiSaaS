/**
 * Dinero en centavos (bigint en la base, number en JS: hasta 2^53 centavos sobra).
 * Formato argentino: punto para miles, coma para decimales ("18.000", "1.250,50").
 */

const MAX_CENTS = 99_999_999_999; // $ 999.999.999,99

/**
 * Convierte lo que escribe una persona en centavos. Devuelve null si no es un monto válido.
 * Acepta: "18000", "18.000", "18.000,50", "18000,5", "$ 18.000", "18000.50".
 */
export function parseAmountToCents(input: string): number | null {
  const raw = input.replace(/\s|\$/g, "");
  if (raw === "" || !/^[0-9.,]+$/.test(raw)) return null;

  let integer: string;
  let decimals = "";

  if (raw.includes(",")) {
    // Coma = decimales; los puntos son separadores de miles.
    const parts = raw.split(",");
    if (parts.length !== 2) return null;
    [integer, decimals] = parts;
    if (integer.includes(".") && !/^\d{1,3}(\.\d{3})+$/.test(integer)) return null;
    integer = integer.replaceAll(".", "");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    // "18.000" o "1.250.000": puntos de miles.
    integer = raw.replaceAll(".", "");
  } else if (/^\d+\.\d{1,2}$/.test(raw)) {
    // "18000.50": punto decimal (copiado de otro sistema).
    [integer, decimals] = raw.split(".");
  } else if (/^\d+$/.test(raw)) {
    integer = raw;
  } else {
    return null;
  }

  if (!/^\d+$/.test(integer) || !/^\d{0,2}$/.test(decimals)) return null;

  const cents = Number(integer) * 100 + Number(decimals.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= MAX_CENTS ? cents : null;
}

/** Monto para mostrar: 1800000 → "$ 18.000"; 1800050 → "$ 18.000,50". */
export function formatCents(cents: number, currency = "ARS"): string {
  const hasDecimals = cents % 100 !== 0;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Monto para precargar un campo de formulario: 1800050 → "18.000,50". */
export function centsToInput(cents: number): string {
  const hasDecimals = cents % 100 !== 0;
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
