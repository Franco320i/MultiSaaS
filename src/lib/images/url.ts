/**
 * URL pública de una foto. En la base se guarda solo la ruta base
 * ({tenant_id}/products/{product_id}/{image_id}); la URL se arma acá.
 * Para pasar a Cloudflare R2 + CDN alcanza con cambiar NEXT_PUBLIC_IMAGES_BASE_URL
 * y copiar los archivos (diseño, sección 8).
 */
export function publicImageUrl(storagePath: string, size: 480 | 1280): string {
  // Leída directo (Next la fija en el build) y no desde env.public: este archivo también lo usa
  // la ficha en el navegador, y así no arrastra la validación de todas las variables. El
  // servidor ya la valida al arrancar (env.public.ts).
  const base = (process.env.NEXT_PUBLIC_IMAGES_BASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/${storagePath}-${size}.webp`;
}

/** Nombre del archivo dentro del bucket para un tamaño. */
export function imageObjectName(storagePath: string, size: 480 | 1280): string {
  return `${storagePath}-${size}.webp`;
}
