import type { Metadata } from "next";
import { buttonClasses } from "@/ui/button-classes";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { publicImageUrl } from "@/lib/images/url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { filterPanelProducts, firstImageByProduct, listCategories, listProducts, parsePanelProductFilter, productCounts } from "@/modules/catalog";
import { PageHeader } from "@/ui/page-header";
import { ProductsBrowser } from "./_components/products-browser";

export const metadata: Metadata = { title: "Productos" };

// app.tuapp.com.ar/[tenant]/productos · Lista de productos (panel fácil, 2026-11-23).
export default function ProductsPage({ params, searchParams }: PageProps<"/panel/[tenant]/productos">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8">
      <Suspense fallback={<ListSkeleton />}>
        <ProductList params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ProductList({ params, searchParams }: PageProps<"/panel/[tenant]/productos">) {
  const { tenant: slug } = await params;
  const { categoria, ver } = await searchParams;
  const access = await requireTenantAccess(slug, "catalog.write");
  const supabase = await createSupabaseServerClient();

  // Se lee la lista entera una vez (hasta 1000) y los contadores y el filtro se calculan acá.
  const filter = parsePanelProductFilter({
    categoria: typeof categoria === "string" ? categoria : undefined,
    ver: typeof ver === "string" ? ver : undefined,
  });
  const [categories, all] = await Promise.all([listCategories(supabase, access.tenantId), listProducts(supabase, access.tenantId)]);
  const counts = productCounts(all);
  const products = filterPanelProducts(all, filter);
  const thumbnails = await firstImageByProduct(supabase, access.tenantId, products.map((p) => p.id));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const base = `/${access.slug}/productos`;
  const active = filter.kind === "category" ? filter.id : filter.kind;
  // El orden se cambia dentro de una categoría (o de "sin categoría"), como antes.
  const reorderable = filter.kind === "category" || filter.kind === "uncategorized";

  // Píldoras con su número; las que dan 0 no se muestran (salvo Todos).
  const filters = [
    { value: "all", label: "Todos", count: counts.all, href: base, warn: false },
    { value: "out", label: "Sin stock", count: counts.outOfStock, href: `${base}?ver=sin-stock`, warn: true },
    { value: "uncategorized", label: "Sin categoría", count: counts.uncategorized, href: `${base}?categoria=sin`, warn: false },
    { value: "hidden", label: "Ocultos", count: counts.hidden, href: `${base}?ver=ocultos`, warn: false },
    ...categories.map((c) => ({
      value: c.id,
      label: c.name,
      count: counts.byCategory.get(c.id) ?? 0,
      href: `${base}?categoria=${c.id}`,
      warn: false,
    })),
  ].filter((f) => f.value === "all" || f.count > 0 || f.value === active);

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Tocá uno para cambiarlo. El interruptor dice si hay stock."
        action={
          <details className="relative">
            <summary className={buttonClasses("secondary", "md", "cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
              Más
            </summary>
            <div className="absolute right-0 z-20 mt-2 flex w-56 flex-col rounded-2xl border border-line bg-surface p-1.5 shadow-lg">
              <Link href={`/${access.slug}/categorias`} className="rounded-xl px-3 py-3 font-semibold hover:bg-surface-muted">
                Categorías
              </Link>
              <Link href={`${base}/importar`} className="rounded-xl px-3 py-3 font-semibold hover:bg-surface-muted">
                Importar desde planilla
              </Link>
            </div>
          </details>
        }
      />

      <nav aria-label="Filtrar productos" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={f.href}
            aria-current={active === f.value ? "page" : undefined}
            className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] whitespace-nowrap ${
              active === f.value ? "bg-accent-soft font-semibold text-accent" : "border border-line bg-surface"
            }`}
          >
            {f.label}
            <span
              className={`text-[13px] tabular-nums ${
                f.warn && f.count > 0 ? "font-bold text-warning" : active === f.value ? "text-accent" : "text-muted"
              }`}
            >
              {f.count}
            </span>
          </Link>
        ))}
      </nav>

      {all.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="font-display text-[22px]">Todavía no tenés productos</p>
          <p className="text-muted">Cargá el primero con su foto y su precio.</p>
        </div>
      ) : products.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">No hay productos con este filtro.</p>
      ) : (
        <ProductsBrowser
          slug={access.slug}
          reorderable={reorderable}
          products={products.map((p) => {
            const thumb = thumbnails.get(p.id)?.storage_path;
            return {
              id: p.id,
              name: p.name,
              price: p.price,
              categoryName: p.category_id ? (categoryName.get(p.category_id) ?? "Sin categoría") : "Sin categoría",
              isPublished: p.is_published,
              isAvailable: p.is_available,
              thumbUrl: thumb ? publicImageUrl(thumb, 480) : null,
            };
          })}
        />
      )}
      {!reorderable && products.length > 1 ? (
        <p className="text-[13px] text-muted">Para cambiar el orden, elegí una categoría arriba.</p>
      ) : null}

      <Link
        href={`${base}/nuevo`}
        className={buttonClasses("primary", "md", "fixed right-4 bottom-24 z-20 shadow-lg md:bottom-8")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden className="size-5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Producto
      </Link>
    </>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="h-8 w-40 rounded-lg bg-surface-muted" />
      <div className="h-12 rounded-full bg-surface-muted" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-2xl bg-surface-muted" />
      ))}
    </div>
  );
}
