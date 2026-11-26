"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { filterProducts, sortByPrice, type PriceOrder } from "@/modules/catalog/presentation";
import type { PublicCategory, PublicProduct } from "@/modules/catalog/public-queries";
import { SearchIcon } from "./icons";
import { ProductCard } from "./product-card";
import { ProductSheet } from "./product-sheet";

export type ProductActions = Record<string, { card?: ReactNode; sheet?: ReactNode }>;

type Section = { id: string; label: string; description: string | null; products: PublicProduct[] };

/**
 * La parte que se toca del catálogo: buscador, orden por precio, categorías en píldoras,
 * grilla de productos y ficha. Todo en el navegador: el catálogo ya vino entero en la página.
 * Los botones de pedidos llegan armados en `actions` (catálogo no importa pedidos).
 */
export function CatalogBrowser({
  products,
  categories,
  currency,
  actions,
}: {
  products: PublicProduct[];
  categories: PublicCategory[];
  currency: string;
  actions: ProductActions;
}) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<PriceOrder>("none");
  const [openId, setOpenId] = useState<string | null>(null);
  const closeSheet = useCallback(() => setOpenId(null), []);

  const sections = useMemo<Section[]>(() => {
    const featured = products.filter((p) => p.isFeatured);
    return [
      { id: "cat-destacados", label: "Destacados", description: null, products: featured },
      ...categories.map((c) => ({
        id: `cat-${c.slug}`,
        label: c.name,
        description: c.description,
        products: products.filter((p) => p.categoryId === c.id),
      })),
      { id: "cat-otros", label: "Otros", description: null, products: products.filter((p) => p.categoryId === null) },
    ].filter((s) => s.products.length > 0);
  }, [products, categories]);

  const searching = query.trim() !== "" || order !== "none";
  const results = useMemo(() => sortByPrice(filterProducts(products, query), order), [products, query, order]);
  const open = openId ? products.find((p) => p.id === openId) : undefined;

  const grid = (list: PublicProduct[]) => (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
      {list.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          currency={currency}
          action={actions[product.id]?.card}
          onOpen={() => setOpenId(product.id)}
        />
      ))}
    </ul>
  );

  if (products.length === 0) {
    return (
      <div className="flex flex-col gap-2 py-16 text-center">
        <p className="font-display text-[22px]">Todavía no hay productos</p>
        <p className="text-muted">El catálogo se está armando. Volvé a pasar pronto.</p>
      </div>
    );
  }

  return (
    <>
      {/* Buscador, orden y categorías: quedan fijos arriba al bajar. */}
      <div className="sticky top-0 z-10 -mx-4 mt-3 flex flex-col gap-2 bg-brand-page/95 px-4 py-2 shadow-[0_8px_16px_-14px_rgb(0_0_0/0.35)] backdrop-blur dark:bg-background/95">
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar en el catálogo</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar"
            enterKeyHint="search"
            className="min-h-12 w-full rounded-[14px] border border-black/[0.07] bg-surface pr-4 pl-11 text-[16px] placeholder:text-muted focus:border-brand focus:outline-none dark:border-line"
          />
        </label>
        <label className="shrink-0">
          <span className="sr-only">Ordenar</span>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as PriceOrder)}
            className="min-h-12 rounded-[14px] border border-black/[0.07] bg-surface px-4 text-[15px] focus:border-brand focus:outline-none dark:border-line"
          >
            <option value="none">Ordenar</option>
            <option value="asc">Menor precio</option>
            <option value="desc">Mayor precio</option>
          </select>
        </label>
      </div>
      {searching ? null : <CategoryPills items={sections.map((s) => ({ id: s.id, label: s.label }))} />}
      </div>

      {searching ? (
        <section aria-live="polite" className="flex flex-col gap-4 pt-6">
          {results.length > 0 ? (
            <>
              <p className="text-[15px] text-muted">
                {results.length === 1 ? "1 producto" : `${results.length} productos`}
                {query.trim() ? ` para «${query.trim()}»` : ""}
              </p>
              {grid(results)}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="font-display text-[20px]">No encontramos «{query.trim()}»</p>
              <p className="text-muted">Probá con otra palabra.</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="min-h-11 rounded-full border border-line px-5 font-semibold"
              >
                Borrar la búsqueda
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          {sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-t`} className="scroll-mt-36 pt-7">
              <h2 id={`${section.id}-t`} className="font-display text-[24px] leading-tight">
                {section.label}
              </h2>
              {section.description ? <p className="mt-1 text-[15px] text-muted">{section.description}</p> : null}
              <span aria-hidden className="mt-2.5 mb-3 block h-[3px] w-7 rounded-full bg-brand" />
              {grid(section.products)}
            </section>
          ))}
        </>
      )}

      {open ? <ProductSheet product={open} currency={currency} action={actions[open.id]?.sheet} onClose={closeSheet} /> : null}
    </>
  );
}

/** Categorías como píldoras, fijas arriba. Marcan la sección que se está viendo. */
function CategoryPills({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const sections = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-id="${active}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="Categorías" className="-mx-4">
      <ul ref={listRef} className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                data-id={item.id}
                aria-current={isActive ? "true" : undefined}
                className={`flex min-h-11 items-center rounded-full px-4 text-[15px] font-[650] whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-brand text-brand-foreground shadow-[0_6px_14px_-6px_var(--brand)]"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
