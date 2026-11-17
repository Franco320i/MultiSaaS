import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { publicImageUrl } from "@/lib/images/url";
import { formatCents } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstImageByProduct, listCategories, listProducts } from "@/modules/catalog";
import { moveProductAction, setProductFlagAction } from "@/modules/catalog/actions";

export const metadata: Metadata = { title: "Productos" };

export default function ProductsPage({ params, searchParams }: PageProps<"/panel/[tenant]/productos">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-8">
      <Suspense fallback={<p className="opacity-70">Cargando…</p>}>
        <ProductList params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ProductList({ params, searchParams }: PageProps<"/panel/[tenant]/productos">) {
  const { tenant: slug } = await params;
  const { categoria } = await searchParams;
  const access = await requireTenantAccess(slug, "catalog.write");
  const supabase = await createSupabaseServerClient();

  // Filtro: id de categoría, "sin" (sin categoría) o nada (todos). Lo que no es válido se ignora.
  const filter =
    categoria === "sin"
      ? { categoryId: null }
      : z.uuid().safeParse(categoria).success
        ? { categoryId: categoria as string }
        : {};

  const [categories, products] = await Promise.all([
    listCategories(supabase, access.tenantId),
    listProducts(supabase, access.tenantId, filter),
  ]);
  const thumbnails = await firstImageByProduct(supabase, access.tenantId, products.map((p) => p.id));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const base = `/${access.slug}/productos`;
  const active = "categoryId" in filter ? (filter.categoryId ?? "sin") : "";

  const filters = [
    { value: "", label: "Todos", href: base },
    ...categories.map((c) => ({ value: c.id, label: c.name, href: `${base}?categoria=${c.id}` })),
    { value: "sin", label: "Sin categoría", href: `${base}?categoria=sin` },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`${base}/importar`} className="rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium">
            Importar desde planilla
          </Link>
          <Link href={`${base}/nuevo`} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
            Nuevo producto
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {filters.map((f) => (
          <Link
            key={f.value || "todos"}
            href={f.href}
            className={`rounded-full border px-3 py-1 ${active === f.value ? "border-foreground bg-foreground text-background" : "border-foreground/20"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="opacity-70">No hay productos acá.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/15">
          {products.map((product, index) => (
            <li key={product.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {"categoryId" in filter && (
                <div className="flex flex-col">
                  <form action={moveProductAction.bind(null, access.slug, product.id, "up")}>
                    <button type="submit" disabled={index === 0} aria-label={`Subir ${product.name}`} className="px-1 text-xs disabled:opacity-20">
                      ▲
                    </button>
                  </form>
                  <form action={moveProductAction.bind(null, access.slug, product.id, "down")}>
                    <button type="submit" disabled={index === products.length - 1} aria-label={`Bajar ${product.name}`} className="px-1 text-xs disabled:opacity-20">
                      ▼
                    </button>
                  </form>
                </div>
              )}
              <Thumbnail path={thumbnails.get(product.id)?.storage_path} />
              <div className="flex min-w-48 flex-1 flex-col">
                <span className="font-medium">{product.name}</span>
                <span className="text-xs opacity-60">
                  {product.category_id ? categoryName.get(product.category_id) : "Sin categoría"} · {formatCents(product.price)}
                  {product.compare_at_price != null && <s className="ml-1">{formatCents(product.compare_at_price)}</s>}
                </span>
              </div>
              <FlagToggle slug={access.slug} productId={product.id} flag="is_published" value={product.is_published} on="Publicado" off="Borrador" />
              <FlagToggle slug={access.slug} productId={product.id} flag="is_available" value={product.is_available} on="Disponible" off="Sin stock" />
              <FlagToggle slug={access.slug} productId={product.id} flag="is_featured" value={product.is_featured} on="Destacado" off="Normal" />
              <Link href={`${base}/${product.id}`} className="text-sm underline">
                Editar
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!("categoryId" in filter) && products.length > 1 && (
        <p className="text-xs opacity-60">Para cambiar el orden, filtrá por una categoría.</p>
      )}
    </>
  );
}

function Thumbnail({ path }: { path?: string }) {
  if (!path) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-[10px] opacity-60">
        Sin foto
      </div>
    );
  }
  return (
    <Image
      src={publicImageUrl(path, 480)}
      alt=""
      width={48}
      height={48}
      unoptimized
      className="size-12 shrink-0 rounded-md object-cover"
    />
  );
}

function FlagToggle(props: {
  slug: string;
  productId: string;
  flag: "is_published" | "is_available" | "is_featured";
  value: boolean;
  on: string;
  off: string;
}) {
  return (
    <form action={setProductFlagAction.bind(null, props.slug, props.productId, props.flag, !props.value)}>
      <button
        type="submit"
        aria-label={`${props.value ? props.on : props.off}. Tocar para cambiar a ${props.value ? props.off : props.on}`}
        className={`rounded-full px-2.5 py-0.5 text-xs ${props.value ? "bg-green-500/15 text-green-800 dark:text-green-300" : "bg-foreground/10 opacity-70"}`}
      >
        {props.value ? props.on : props.off}
      </button>
    </form>
  );
}
