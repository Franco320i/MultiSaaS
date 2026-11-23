import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { publicImageUrl } from "@/lib/images/url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstImageByProduct, listCategories, listProducts } from "@/modules/catalog";
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

  // Filtro: id de categoría, "sin" (sin categoría), ocultos o nada (todos). Lo que no es válido se ignora.
  const hiddenOnly = ver === "ocultos";
  const filter =
    categoria === "sin"
      ? { categoryId: null }
      : z.uuid().safeParse(categoria).success
        ? { categoryId: categoria as string }
        : {};

  const [categories, all] = await Promise.all([
    listCategories(supabase, access.tenantId),
    listProducts(supabase, access.tenantId, hiddenOnly ? {} : filter),
  ]);
  const products = hiddenOnly ? all.filter((p) => !p.is_published) : all;
  const thumbnails = await firstImageByProduct(supabase, access.tenantId, products.map((p) => p.id));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const base = `/${access.slug}/productos`;
  const active = hiddenOnly ? "ocultos" : "categoryId" in filter ? (filter.categoryId ?? "sin") : "";

  const filters = [
    { value: "", label: "Todos", href: base },
    ...categories.map((c) => ({ value: c.id, label: c.name, href: `${base}?categoria=${c.id}` })),
    { value: "sin", label: "Sin categoría", href: `${base}?categoria=sin` },
    { value: "ocultos", label: "Ocultos", href: `${base}?ver=ocultos` },
  ];

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[28px] leading-tight">Productos</h1>
          <p className="text-[15px] text-muted">Tocá un producto para cambiarlo. El interruptor dice si hay stock.</p>
        </div>
        <details className="relative shrink-0">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-full border border-line bg-surface px-4 font-semibold [&::-webkit-details-marker]:hidden">
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
      </header>

      <nav aria-label="Filtrar productos" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {filters.map((f) => (
          <Link
            key={f.value || "todos"}
            href={f.href}
            aria-current={active === f.value ? "page" : undefined}
            className={`flex min-h-10 shrink-0 items-center rounded-full px-4 text-[15px] whitespace-nowrap ${
              active === f.value ? "bg-foreground font-semibold text-background" : "border border-line bg-surface"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {all.length === 0 && !hiddenOnly && !("categoryId" in filter) ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="font-display text-[22px]">Todavía no tenés productos</p>
          <p className="text-muted">Cargá el primero con su foto y su precio.</p>
        </div>
      ) : (
        <ProductsBrowser
          slug={access.slug}
          reorderable={"categoryId" in filter && !hiddenOnly}
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
      {!("categoryId" in filter) && !hiddenOnly && products.length > 1 ? (
        <p className="text-[13px] text-muted">Para cambiar el orden, elegí una categoría arriba.</p>
      ) : null}

      <Link
        href={`${base}/nuevo`}
        className="fixed right-4 bottom-24 z-20 flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-foreground shadow-lg md:bottom-8"
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
