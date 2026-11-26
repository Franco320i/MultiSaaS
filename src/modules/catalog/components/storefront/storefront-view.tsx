import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { Storefront } from "@/core/tenancy/storefront";
import { summarizeHours } from "@/lib/hours";
import { publicImageUrl } from "@/lib/images/url";
import { mapsUrl, storeChips } from "@/modules/catalog/presentation";
import type { PublicCatalog, PublicProduct } from "@/modules/catalog/public-queries";
import { CatalogBrowser, type ProductActions } from "./catalog-browser";
import { CheckIcon, MapPinIcon } from "./icons";
import { OpenStatus } from "./open-status";

/**
 * Catálogo público: una plantilla para todos los locales
 * (docs/superpowers/specs/2026-11-22-catalogo-nuevo-design.md). Cada local personaliza la
 * portada, el logo, el nombre, la frase y el color; el resto es igual para todos.
 *
 * Componente de servidor sin estado de petición: todo sale de los argumentos, que vienen de
 * funciones cacheadas por host y por comercio. La parte que se toca (buscador, orden,
 * categorías, ficha) es CatalogBrowser, en el navegador.
 *
 * `productAction(producto, variante)` y `children` son espacios que llena la ruta (los botones
 * y la barra del pedido del módulo pedidos): así el catálogo no importa otro módulo.
 */
export function StorefrontView({
  storefront,
  catalog,
  productAction,
  children,
}: {
  storefront: Storefront;
  catalog: PublicCatalog;
  productAction?: (product: PublicProduct, variant: "card" | "sheet") => ReactNode;
  children?: ReactNode;
}) {
  const hoursLines = summarizeHours(storefront.hours);
  const chips = storeChips(storefront);
  const directions = mapsUrl(storefront.address, storefront.city);
  const place = [storefront.address, storefront.city].filter(Boolean).join(", ");
  const brandStyle = {
    "--brand": storefront.brand,
    "--brand-foreground": storefront.brandForeground,
  } as CSSProperties;

  const actions: ProductActions = {};
  if (productAction) {
    for (const product of catalog.products) {
      if (!product.isAvailable) continue;
      actions[product.id] = { card: productAction(product, "card"), sheet: productAction(product, "sheet") };
    }
  }

  return (
    <div data-surface="storefront" style={brandStyle} className="flex min-h-full flex-1 flex-col bg-background">
      {/* Portada: la foto del comercio con un velo oscuro abajo para que el texto blanco se lea,
          o, sin foto, el color de la marca. */}
      <header
        className={storefront.cover_path ? "relative bg-cover bg-center text-white" : "bg-brand text-brand-foreground"}
        style={{
          backgroundImage: storefront.cover_path
            ? `linear-gradient(to top, rgb(0 0 0 / 0.7), rgb(0 0 0 / 0.15) 60%), url("${publicImageUrl(storefront.cover_path, 1280)}")`
            : "radial-gradient(circle at 85% 15%, color-mix(in srgb, var(--brand-foreground) 16%, transparent), transparent 55%)",
        }}
      >
        <div className="mx-auto flex min-h-44 max-w-5xl items-end gap-4 px-4 pt-12 pb-6 sm:min-h-56">
          {storefront.logo_path ? (
            <Image
              src={publicImageUrl(storefront.logo_path, 480)}
              alt={`Logo de ${storefront.display_name}`}
              width={72}
              height={72}
              unoptimized
              priority
              className="size-16 shrink-0 rounded-full bg-surface object-cover ring-2 ring-white/80 sm:size-18"
            />
          ) : null}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-display text-[32px] leading-tight text-balance sm:text-[40px]">{storefront.display_name}</h1>
            {storefront.tagline ? <p className="text-[15px] opacity-90">{storefront.tagline}</p> : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 pt-4 text-[15px]">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <OpenStatus
            hours={storefront.hours}
            mode={storefront.open_mode}
            timeZone={storefront.timezone}
            closedMessage={storefront.closed_message}
          />
          {!place && storefront.city ? <span className="text-muted">{storefront.city}</span> : null}
        </p>
        {place ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-muted">{place}</span>
            {directions ? (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 font-semibold"
              >
                <MapPinIcon />
                Cómo llegar
              </a>
            ) : null}
          </div>
        ) : null}
        {hoursLines.length > 0 ? (
          <details className="group text-muted">
            <summary className="w-fit cursor-pointer py-1 underline-offset-4 hover:underline">Ver horarios</summary>
            <ul className="mt-1 flex flex-col gap-0.5">
              {hoursLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {chips.length > 0 ? (
          <ul aria-label="Envío y pagos" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((chip) => (
              <li key={chip} className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-[14px] whitespace-nowrap tabular-nums">
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
        {storefront.highlights.length > 0 ? (
          <section aria-labelledby="incluye" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 sm:max-w-xl">
            <h2 id="incluye" className="font-semibold">
              Todos los pedidos incluyen
            </h2>
            <ul className="flex flex-col gap-1.5">
              {storefront.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-28">
        <CatalogBrowser products={catalog.products} categories={catalog.categories} currency={storefront.currency} actions={actions} />
      </main>

      <StorefrontFooter storefront={storefront} />
      {children}
    </div>
  );
}

function StorefrontFooter({ storefront }: { storefront: Storefront }) {
  const place = [storefront.address, storefront.city].filter(Boolean).join(", ");
  if (!storefront.description && !place && !storefront.instagram) return null;

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-[15px] text-muted">
        <p className="font-display text-[18px] text-foreground">{storefront.display_name}</p>
        {storefront.description ? <p>{storefront.description}</p> : null}
        {place ? <p>{place}</p> : null}
        {storefront.instagram ? (
          <p>
            <a
              href={`https://www.instagram.com/${storefront.instagram}/`}
              rel="noopener noreferrer"
              target="_blank"
              className="inline-block py-2 font-semibold text-foreground underline underline-offset-4"
            >
              Instagram: @{storefront.instagram}
            </a>
          </p>
        ) : null}
      </div>
    </footer>
  );
}
