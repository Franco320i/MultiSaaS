import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { Storefront } from "@/core/tenancy/storefront";
import { summarizeHours } from "@/lib/hours";
import { publicImageUrl } from "@/lib/images/url";
import { formatCents } from "@/lib/money";
import type { PublicCatalog, PublicProduct } from "@/modules/catalog/public-queries";
import { CategoryNav } from "./category-nav";
import { OpenStatus } from "./open-status";

/**
 * Catálogo público (docs/design/sistema-visual.md, "Catálogo público").
 * Componente de servidor sin estado de petición: todo sale de los argumentos, que
 * vienen de funciones cacheadas por host y por comercio.
 *
 * `productAction` y `children` son espacios que llena la ruta (por ejemplo, el botón
 * "Agregar" y la barra del pedido del módulo pedidos): así el catálogo no importa
 * otro módulo.
 */
export function StorefrontView({
  storefront,
  catalog,
  productAction,
  children,
}: {
  storefront: Storefront;
  catalog: PublicCatalog;
  productAction?: (product: PublicProduct) => ReactNode;
  children?: ReactNode;
}) {
  const { categories, products } = catalog;
  const featured = products.filter((p) => p.isFeatured);

  const sections = [
    ...categories.map((c) => ({
      id: `cat-${c.slug}`,
      label: c.name,
      description: c.description,
      products: products.filter((p) => p.categoryId === c.id),
    })),
    { id: "cat-otros", label: "Otros", description: null, products: products.filter((p) => p.categoryId === null) },
  ].filter((s) => s.products.length > 0);

  const hoursLines = summarizeHours(storefront.hours);
  const brandStyle = {
    "--brand": storefront.brand,
    "--brand-foreground": storefront.brandForeground,
  } as CSSProperties;

  return (
    <div style={brandStyle} className="flex min-h-full flex-1 flex-col bg-background">
      <header
        className="bg-brand text-brand-foreground"
        style={{
          backgroundImage:
            "radial-gradient(circle at 85% 15%, color-mix(in srgb, var(--brand-foreground) 16%, transparent), transparent 55%)",
        }}
      >
        <div className="mx-auto flex min-h-44 max-w-2xl flex-col justify-end gap-1 px-4 pb-6 pt-12 sm:min-h-56">
          <h1 className="font-display text-[32px] leading-tight text-balance sm:text-[40px]">{storefront.display_name}</h1>
          {storefront.tagline ? <p className="text-[15px] opacity-90">{storefront.tagline}</p> : null}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-4 text-[15px]">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <OpenStatus
            hours={storefront.hours}
            mode={storefront.open_mode}
            timeZone={storefront.timezone}
            closedMessage={storefront.closed_message}
          />
          {storefront.city ? <span className="text-muted">{storefront.city}</span> : null}
        </p>
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
      </div>

      <CategoryNav items={sections.map((s) => ({ id: s.id, label: s.label }))} />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-28">
        {products.length === 0 ? (
          <div className="flex flex-col gap-2 py-16 text-center">
            <p className="font-display text-[22px]">Todavía no hay productos</p>
            <p className="text-muted">El catálogo se está armando. Volvé a pasar pronto.</p>
          </div>
        ) : null}

        {featured.length > 0 ? (
          <section aria-labelledby="destacados" className="pt-6">
            <h2 id="destacados" className="font-display text-[20px]">
              Destacados
            </h2>
            <ul className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {featured.map((product) => (
                <FeaturedCard key={product.id} product={product} currency={storefront.currency} action={productAction?.(product)} />
              ))}
            </ul>
          </section>
        ) : null}

        {sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-t`} className="scroll-mt-14 pt-8">
            <h2 id={`${section.id}-t`} className="font-display text-[20px]">
              {section.label}
            </h2>
            {section.description ? <p className="mt-1 text-[15px] text-muted">{section.description}</p> : null}
            <ul className="mt-1 divide-y divide-line">
              {section.products.map((product) => (
                <ProductRow key={product.id} product={product} currency={storefront.currency} action={productAction?.(product)} />
              ))}
            </ul>
          </section>
        ))}
      </main>

      <StorefrontFooter storefront={storefront} />
      {children}
    </div>
  );
}

function Price({ product, currency }: { product: PublicProduct; currency: string }) {
  const hasDiscount = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
      <span className="font-semibold">{formatCents(product.price, currency)}</span>
      {hasDiscount ? (
        <s className="text-[13px] text-muted">
          <span className="sr-only">Antes </span>
          {formatCents(product.compareAtPrice!, currency)}
        </s>
      ) : null}
    </p>
  );
}

function SoldOut() {
  return (
    <span className="w-fit rounded-full bg-danger-soft px-2 py-0.5 text-[13px] font-semibold text-danger">Sin stock</span>
  );
}

function ProductRow({ product, currency, action }: { product: PublicProduct; currency: string; action?: ReactNode }) {
  return (
    <li className="flex gap-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className={`text-[17px] font-semibold leading-snug ${product.isAvailable ? "" : "text-muted"}`}>
          {product.name}
        </h3>
        {product.description ? <p className="line-clamp-2 text-[15px] text-muted">{product.description}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Price product={product} currency={currency} />
          {product.isAvailable ? null : <SoldOut />}
        </div>
        {product.isAvailable && action ? <div className="mt-2">{action}</div> : null}
      </div>
      {product.imagePath ? (
        <Image
          src={publicImageUrl(product.imagePath, 480)}
          alt={product.imageAlt ?? product.name}
          width={96}
          height={96}
          unoptimized
          className={`size-24 shrink-0 rounded-xl bg-surface-muted object-cover ${product.isAvailable ? "" : "opacity-50 grayscale"}`}
        />
      ) : null}
    </li>
  );
}

function FeaturedCard({ product, currency, action }: { product: PublicProduct; currency: string; action?: ReactNode }) {
  return (
    <li className="flex w-40 shrink-0 flex-col gap-2">
      {product.imagePath ? (
        <Image
          src={publicImageUrl(product.imagePath, 480)}
          alt={product.imageAlt ?? product.name}
          width={160}
          height={160}
          unoptimized
          className={`aspect-square w-40 rounded-xl bg-surface-muted object-cover ${product.isAvailable ? "" : "opacity-50 grayscale"}`}
        />
      ) : (
        <div aria-hidden className="flex aspect-square w-40 items-end rounded-xl bg-brand p-3 text-brand-foreground">
          <span className="font-display text-[20px] leading-tight">{product.name}</span>
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[15px] font-semibold leading-snug">{product.name}</h3>
        <Price product={product} currency={currency} />
        {product.isAvailable ? null : <SoldOut />}
        {product.isAvailable && action ? <div className="mt-1">{action}</div> : null}
      </div>
    </li>
  );
}

function StorefrontFooter({ storefront }: { storefront: Storefront }) {
  const place = [storefront.address, storefront.city].filter(Boolean).join(", ");
  if (!storefront.description && !place && !storefront.instagram) return null;

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-8 text-[15px] text-muted">
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
