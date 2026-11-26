import Link from "next/link";
import { CopyLinkButton } from "./copy-link-button";

/**
 * Tarjeta verde del Inicio con el link del catálogo: copiar y compartir (QR). Si todavía no
 * está publicado, no muestra una dirección que no funciona.
 */
// Botones sobre el fondo verde: blanco (principal) y translúcido. No usan buttonClasses porque
// sus colores son para fondo claro.
const CARD_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[16px] font-semibold whitespace-nowrap " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-foreground";
const SOLID = `${CARD_BUTTON} bg-accent-foreground text-accent hover:opacity-90`;
const GHOST = `${CARD_BUTTON} border border-accent-foreground/30 bg-accent-foreground/10 text-accent-foreground hover:bg-accent-foreground/20`;

export function CatalogLinkCard({ slug, url, canPublish }: { slug: string; url: string | null; canPublish: boolean }) {
  const host = url ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;
  return (
    <section
      aria-labelledby="tu-catalogo"
      className="relative flex flex-col gap-3 overflow-hidden rounded-[20px] bg-accent p-4 text-accent-foreground"
    >
      <span aria-hidden className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-accent-foreground/10" />
      <div className="flex flex-col">
        <h2 id="tu-catalogo" className="text-[13px] opacity-85">
          Tu catálogo
        </h2>
        {host ? (
          <a
            href={url!}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit py-1 text-[17px] font-bold break-all underline-offset-4 hover:underline focus-visible:outline-accent-foreground"
          >
            {host}
          </a>
        ) : (
          <p className="py-1 text-[16px] font-semibold">Todavía no está publicado</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {url ? (
          <>
            <CopyLinkButton url={url} className={SOLID} />
            {canPublish ? (
              <Link
                href={`/${slug}/ajustes?seccion=link`}
                className={GHOST}
              >
                Compartir · QR
              </Link>
            ) : null}
          </>
        ) : canPublish ? (
          <Link href={`/${slug}/ajustes?seccion=link`} className={SOLID}>
            Publicar
          </Link>
        ) : null}
      </div>
    </section>
  );
}
