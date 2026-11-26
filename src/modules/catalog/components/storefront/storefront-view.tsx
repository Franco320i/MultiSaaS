import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { Storefront } from "@/core/tenancy/storefront";
import { publicImageUrl } from "@/lib/images/url";
import { catalogLayout, mapsUrl, storeStatus } from "@/modules/catalog/presentation";
import type { PublicCatalog, PublicProduct } from "@/modules/catalog/public-queries";
import { CatalogBrowser, type ProductActions } from "./catalog-browser";
import { CheckIcon, MapPinIcon, StoreIcon, TruckIcon } from "./icons";
import { OpenStatus } from "./open-status";
import { StatusIcon, TodayHours } from "./today-hours";

/**
 * Catálogo público: una plantilla para todos los locales (rediseño 11b,
 * docs/superpowers/specs/2026-11-26-rediseno-catalogo-design.md). Cada local pone portada,
 * logo, nombre, frase y color; los colores derivados (brand2, tint, page) y la forma de los
 * productos (Carta o Grilla, según el rubro) salen solos: el comercio no los elige.
 *
 * Componente de servidor sin estado de petición: todo sale de los argumentos, que vienen de
 * funciones cacheadas por host y por comercio. Lo que depende de la hora (abierto ahora,
 * horario de hoy) se calcula en el navegador.
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
  const status = storeStatus(storefront);
  const directions = mapsUrl(storefront.address, storefront.city);
  const place = [storefront.address, storefront.city].filter(Boolean).join(", ");
  const showOpen = !(storefront.open_mode === "auto" && storefront.hours.length === 0);
  const brandStyle = {
    "--brand": storefront.brand,
    "--brand-foreground": storefront.brandForeground,
    "--brand-2": storefront.brand2,
    "--brand-tint": storefront.brandTint,
    "--brand-page": storefront.brandPage,
  } as CSSProperties;

  const actions: ProductActions = {};
  if (productAction) {
    for (const product of catalog.products) {
      if (!product.isAvailable) continue;
      actions[product.id] = { card: productAction(product, "card"), sheet: productAction(product, "sheet") };
    }
  }

  return (
    <div
      data-surface="storefront"
      style={brandStyle}
      className="flex min-h-full flex-1 flex-col bg-brand-page dark:bg-background"
    >
      {/* Portada: la foto con un velo en diagonal o, sin foto, el degradé de los dos colores. */}
      <div
        aria-hidden
        className="h-[150px] bg-cover bg-center sm:h-[220px]"
        style={{
          backgroundImage: storefront.cover_path
            ? `linear-gradient(135deg, rgb(14 16 12 / 0.55), rgb(14 16 12 / 0.15)), url("${publicImageUrl(storefront.cover_path, 1280)}")`
            : "radial-gradient(circle at 82% 18%, rgb(255 255 255 / 0.18), transparent 45%), linear-gradient(135deg, var(--brand), var(--brand-2))",
        }}
      />

      <header className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4">
        <div className="-mt-[38px] flex items-end gap-3 sm:-mt-11">
          {storefront.logo_path ? (
            <Image
              src={publicImageUrl(storefront.logo_path, 480)}
              alt={`Logo de ${storefront.display_name}`}
              width={88}
              height={88}
              unoptimized
              priority
              className="size-[76px] shrink-0 rounded-full border-4 border-brand-page bg-surface object-cover sm:size-[88px] dark:border-background"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-[76px] shrink-0 place-items-center rounded-full border-4 border-brand-page bg-brand text-[26px] font-bold text-brand-foreground sm:size-[88px] dark:border-background"
            >
              {initials(storefront.display_name)}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-[28px] leading-tight text-balance sm:text-[36px]">{storefront.display_name}</h1>
          {storefront.tagline ? <p className="text-[15px] text-muted">{storefront.tagline}</p> : null}
          {place ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
              <span className="text-muted">{place}</span>
              {directions ? (
                <a
                  href={directions}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand dark:text-foreground"
                >
                  <MapPinIcon />
                  Cómo llegar
                </a>
              ) : null}
            </p>
          ) : null}
        </div>

        {/* Tarjeta de estado: todo lo que el cliente necesita saber antes de pedir. */}
        <section
          aria-label="Estado del local"
          className="grid grid-cols-2 gap-1 rounded-[18px] border border-black/5 bg-surface p-1.5 shadow-[0_10px_26px_-14px_rgb(20_24_18/0.35)] sm:max-w-3xl sm:grid-cols-4 dark:border-line"
        >
          {showOpen ? (
            <div className="flex min-h-11 items-center gap-2.5 p-2">
              <StatusIcon>
                <CheckIcon />
              </StatusIcon>
              <span className="min-w-0">
                <span className="block text-[12px] leading-tight text-muted">Estado</span>
                <span className="block text-[14px] leading-tight">
                  <OpenStatus
                    hours={storefront.hours}
                    mode={storefront.open_mode}
                    timeZone={storefront.timezone}
                    closedMessage={storefront.closed_message}
                  />
                </span>
              </span>
            </div>
          ) : null}
          {status.minimum ? (
            <StatusItem icon={<StoreIcon />} label="Pedido mínimo" value={status.minimum} />
          ) : null}
          {status.delivery ? <StatusItem icon={<TruckIcon />} label="Envío" value={status.delivery} /> : null}
          {storefront.hours.length > 0 ? <TodayHours hours={storefront.hours} timeZone={storefront.timezone} /> : null}
        </section>
        {status.payments ? <p className="text-[14px] text-muted">Pagás con {status.payments.toLowerCase()}</p> : null}

        {storefront.highlights.length > 0 ? (
          <section
            aria-labelledby="incluye"
            className="flex flex-col gap-2 rounded-2xl bg-brand-tint p-4 sm:max-w-xl dark:border dark:border-line dark:bg-surface"
          >
            <h2 id="incluye" className="font-semibold">
              Todos los pedidos incluyen
            </h2>
            <ul className="flex flex-col gap-1.5">
              {storefront.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand dark:text-foreground" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-28">
        <CatalogBrowser
          products={catalog.products}
          categories={catalog.categories}
          currency={storefront.currency}
          actions={actions}
          layout={catalogLayout(storefront.template_key)}
        />
      </main>

      <StorefrontFooter storefront={storefront} />
      {children}
    </div>
  );
}

function StatusItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center gap-2.5 p-2">
      <StatusIcon>{icon}</StatusIcon>
      <span className="min-w-0">
        <span className="block text-[12px] leading-tight text-muted">{label}</span>
        <span className="block text-[14px] leading-tight font-semibold tabular-nums">{value}</span>
      </span>
    </div>
  );
}

/** Hasta dos iniciales del nombre, para el círculo cuando el comercio no tiene logo. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
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
