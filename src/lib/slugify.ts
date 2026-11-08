/**
 * Convierte un nombre en un slug para URLs: "Hamburguesa Doble Ñandú" → "hamburguesa-doble-nandu".
 * Solo a-z, 0-9 y guiones, sin guiones al principio ni al final.
 */
export function slugify(input: string, maxLength = 80): string {
  const slug = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes y diéresis (ñ → n)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

  return slug || "item";
}

/** Variante numerada para resolver choques: ("remera", 2) → "remera-2", respetando el largo máximo. */
export function slugWithSuffix(base: string, n: number, maxLength = 80): string {
  if (n <= 1) return base;
  const suffix = `-${n}`;
  return `${base.slice(0, maxLength - suffix.length).replace(/-+$/g, "")}${suffix}`;
}
