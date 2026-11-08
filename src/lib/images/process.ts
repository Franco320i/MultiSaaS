import "server-only";
import sharp, { type Metadata, type OutputInfo } from "sharp";

/**
 * Re-procesa en el servidor toda foto que sube un comercio (diseño, sección 8).
 * Aunque el navegador ya la achicó, acá se decide qué se publica:
 *   - se detecta el formato REAL por el contenido (no por la extensión ni el tipo que dice el navegador);
 *   - solo JPEG, PNG o WebP (nunca SVG: puede contener scripts; nunca GIF animados);
 *   - se rechazan imágenes gigantes (bombas de descompresión);
 *   - se corrige la rotación y se eliminan los metadatos (incluida la ubicación GPS);
 *   - se generan dos tamaños en WebP: 480 px (listados) y 1280 px (detalle).
 */

export const IMAGE_SIZES = [480, 1280] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

/** Bytes máximos que acepta el servidor (el navegador manda menos de 1 MB normalmente). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000; // 40 megapíxeles
const MIN_SIDE = 200;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class ImageError extends Error {}

export type ProcessedImage = {
  /** Ancho y alto de la versión de 1280. */
  width: number;
  height: number;
  files: Record<ImageSize, Buffer>;
};

export async function processProductImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new ImageError("El archivo está vacío.");
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageError("La foto pesa demasiado (máximo 4 MB).");

  let metadata: Metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new ImageError("El archivo no es una imagen válida. Subí una foto JPG, PNG o WebP.");
  }

  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new ImageError("Formato no admitido. Subí una foto JPG, PNG o WebP.");
  }
  if ((metadata.pages ?? 1) > 1) throw new ImageError("No se admiten imágenes animadas.");

  const width = metadata.autoOrient?.width ?? metadata.width ?? 0;
  const height = metadata.autoOrient?.height ?? metadata.height ?? 0;
  if (Math.min(width, height) < MIN_SIDE) {
    throw new ImageError(`La foto es muy chica: tiene que medir al menos ${MIN_SIDE} px de lado.`);
  }

  try {
    const files = {} as Record<ImageSize, Buffer>;
    let large: OutputInfo | undefined;

    for (const size of IMAGE_SIZES) {
      const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate() // según EXIF; luego los metadatos se descartan (sharp no los copia por defecto)
        .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      files[size] = data;
      if (size === 1280) large = info;
    }

    return { width: large!.width, height: large!.height, files };
  } catch {
    throw new ImageError("No pudimos procesar la foto. Probá con otra.");
  }
}
