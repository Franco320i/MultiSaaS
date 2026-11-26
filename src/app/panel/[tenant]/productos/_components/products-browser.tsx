"use client";

import Image from "next/image";
import { useCallback, useOptimistic, useState, useTransition } from "react";
import { formatCents } from "@/lib/money";
import { moveProductAction, setProductFlagAction } from "@/modules/catalog/actions";
import { QuickEditSheet } from "./quick-edit-sheet";

export type ProductRow = {
  id: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  categoryId: string | null;
  categoryName: string;
  isPublished: boolean;
  isAvailable: boolean;
  thumbUrl: string | null;
};

/**
 * Lista de productos del panel (docs/superpowers/specs/2026-11-23-panel-facil-design.md):
 * buscador, filas enteras tocables (abren la hoja de edición rápida) y el interruptor "Hay stock / Sin stock", que cambia al
 * instante y se guarda con setProductFlagAction (verifica el acceso del lado del servidor).
 */
export function ProductsBrowser({
  slug,
  products,
  categories,
  reorderable,
}: {
  slug: string;
  products: ProductRow[];
  categories: { id: string; name: string }[];
  reorderable: boolean;
}) {
  const [query, setQuery] = useState("");
  // Copia del producto (no el id): si al guardar sale del filtro, la hoja sigue abierta hasta cerrarse.
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const closeSheet = useCallback(() => setEditing(null), []);
  const words = normalize(query).split(" ").filter(Boolean);
  const shown = words.length === 0 ? products : products.filter((p) => words.every((w) => normalize(p.name).includes(w)));

  return (
    <div className="flex flex-col gap-3">
      <label className="relative">
        <span className="sr-only">Buscar producto</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto"
          className="min-h-12 w-full rounded-full border border-line bg-surface pr-4 pl-12 text-[16px] placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </label>

      {shown.length === 0 ? (
        <p className="py-8 text-center text-muted">{query ? `No hay productos con «${query.trim()}».` : "No hay productos acá."}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((product, index) => (
            <ProductItem
              key={product.id}
              slug={slug}
              product={product}
              reorder={reorderable && !query ? { first: index === 0, last: index === shown.length - 1 } : null}
              onEdit={() => setEditing(product)}
            />
          ))}
        </ul>
      )}
      {editing ? <QuickEditSheet key={editing.id} slug={slug} product={editing} categories={categories} onClose={closeSheet} /> : null}
    </div>
  );
}

function ProductItem({
  slug,
  product,
  reorder,
  onEdit,
}: {
  slug: string;
  product: ProductRow;
  reorder: { first: boolean; last: boolean } | null;
  onEdit: () => void;
}) {
  const [available, setAvailable] = useOptimistic(product.isAvailable);
  const [, startTransition] = useTransition();

  const toggle = () => {
    const next = !available;
    startTransition(async () => {
      setAvailable(next);
      await setProductFlagAction(slug, product.id, "is_available", next);
    });
  };

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5">
      {reorder ? (
        <div className="flex flex-col gap-1">
          <form action={moveProductAction.bind(null, slug, product.id, "up")}>
            <button type="submit" disabled={reorder.first} aria-label={`Subir ${product.name}`} className="grid size-9 place-items-center rounded-lg border border-line disabled:opacity-30">
              ▲
            </button>
          </form>
          <form action={moveProductAction.bind(null, slug, product.id, "down")}>
            <button type="submit" disabled={reorder.last} aria-label={`Bajar ${product.name}`} className="grid size-9 place-items-center rounded-lg border border-line disabled:opacity-30">
              ▼
            </button>
          </form>
        </div>
      ) : null}
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <span className="sr-only">Editar</span>
        {product.thumbUrl ? (
          <Image src={product.thumbUrl} alt="" width={56} height={56} unoptimized className="size-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-xl bg-surface-muted text-[11px] text-muted">Sin foto</span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[16px] font-semibold">{product.name}</span>
          <span className="text-[14px] text-muted tabular-nums">{formatCents(product.price)}</span>
          {!product.isPublished ? (
            <span className="text-[13px] font-semibold text-muted">Oculto: no se ve en tu catálogo</span>
          ) : !available ? (
            <span className="text-[13px] font-semibold text-danger">Sin stock: no se puede pedir</span>
          ) : (
            <span className="truncate text-[13px] text-muted">{product.categoryName}</span>
          )}
        </span>
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={available}
        aria-label={`${product.name}: ${available ? "hay stock" : "sin stock"}`}
        onClick={toggle}
        className="flex min-h-11 shrink-0 flex-col items-center justify-center gap-1 px-1 text-[11px] text-muted"
      >
        <span className={`relative h-7 w-12 rounded-full transition-colors ${available ? "bg-accent" : "bg-line-strong"}`}>
          <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${available ? "left-6" : "left-1"}`} />
        </span>
        {available ? "Hay stock" : "Sin stock"}
      </button>
    </li>
  );
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
