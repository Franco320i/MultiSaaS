/**
 * Achica la foto en el navegador antes de subirla (diseño, sección 8, paso 1).
 * Una foto de celular pesa 3-8 MB; achicada a 2000 px en WebP queda en menos de 1 MB.
 * Esto es solo para ahorrar datos y tiempo: el servidor vuelve a validar y procesar todo.
 */

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(",");
const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
const MAX_SIDE = 2000;

export class ResizeError extends Error {}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function resizeForUpload(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new ResizeError("Subí una foto JPG, PNG o WebP.");
  if (file.size > MAX_ORIGINAL_BYTES) throw new ResizeError("La foto pesa demasiado (máximo 15 MB).");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ResizeError("No pudimos abrir esa foto. Probá con otra.");
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Algunos navegadores viejos no codifican WebP: en ese caso se manda JPEG.
  const webp = await toBlob(canvas, "image/webp", 0.85);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new ResizeError("No pudimos preparar la foto. Probá con otra.");
  return jpeg;
}
