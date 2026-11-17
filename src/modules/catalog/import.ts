import { parseAmountToCents } from "@/lib/money";

/**
 * Importador de productos desde una planilla (diseño, sección 10, paso 4).
 * El dueño copia las celdas de Excel o Google Sheets y las pega: eso llega como texto
 * con tabulaciones entre columnas. Columnas: categoría, nombre, descripción, precio.
 * La primera fila se ignora si es un encabezado. Función pura: sin base ni Next.
 */

export const MAX_IMPORT_ROWS = 300;

export type ImportRow = {
  /** Número de fila en lo pegado (1 = primera), para que el dueño la encuentre. */
  line: number;
  category: string | null;
  name: string;
  description: string | null;
  price: number | null;
  errors: string[];
};

export type ParsedImport = { rows: ImportRow[]; skippedHeader: boolean; tooMany: boolean };

const HEADER_WORDS = ["categoría", "categoria", "nombre", "producto", "precio", "descripción", "descripcion"];

function splitLine(line: string): string[] {
  // Pegado de planilla: tabulaciones. Si no hay, se acepta punto y coma (CSV en español).
  const separator = line.includes("\t") ? "\t" : ";";
  return line.split(separator).map((cell) => cell.trim().replace(/^"(.*)"$/, "$1").trim());
}

export function parseSpreadsheet(text: string): ParsedImport {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line, index) => ({ line: index + 1, cells: splitLine(line) }))
    .filter((l) => l.cells.some((cell) => cell !== ""));

  let skippedHeader = false;
  if (lines.length > 0) {
    const first = lines[0].cells.map((c) => c.toLowerCase());
    if (first.filter((cell) => HEADER_WORDS.includes(cell)).length >= 2) {
      lines.shift();
      skippedHeader = true;
    }
  }

  const tooMany = lines.length > MAX_IMPORT_ROWS;
  const rows = lines.slice(0, MAX_IMPORT_ROWS).map(({ line, cells }): ImportRow => {
    const [category = "", name = "", description = "", price = ""] = cells;
    const errors: string[] = [];

    if (!name) errors.push("Falta el nombre.");
    else if (name.length > 120) errors.push("El nombre tiene más de 120 caracteres.");
    if (category.length > 60) errors.push("La categoría tiene más de 60 caracteres.");
    if (description.length > 2000) errors.push("La descripción tiene más de 2000 caracteres.");

    const cents = parseAmountToCents(price.replace(/^\$\s*/, ""));
    if (!price) errors.push("Falta el precio.");
    else if (cents === null) errors.push(`El precio "${price}" no es válido: escribí, por ejemplo, 18.000.`);

    return {
      line,
      category: category || null,
      name,
      description: description || null,
      price: cents,
      errors,
    };
  });

  return { rows, skippedHeader, tooMany };
}
