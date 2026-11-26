import type { Metadata } from "next";
import { PageHeader } from "@/ui/page-header";
import Link from "next/link";
import { Suspense } from "react";
import { ListSkeleton } from "@/ui/skeleton";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCategories, listProducts } from "@/modules/catalog";
import { moveCategoryAction } from "@/modules/catalog/actions";

export const metadata: Metadata = { title: "Categorías" };

export default function CategoriesPage({ params }: PageProps<"/panel/[tenant]/categorias">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8">
      <Suspense fallback={<ListSkeleton />}>
        <CategoryList params={params} />
      </Suspense>
    </main>
  );
}

async function CategoryList({ params }: Pick<PageProps<"/panel/[tenant]/categorias">, "params">) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug, "catalog.write");
  const supabase = await createSupabaseServerClient();
  const [categories, products] = await Promise.all([
    listCategories(supabase, access.tenantId),
    listProducts(supabase, access.tenantId, {}),
  ]);
  const counts = new Map<string, number>();
  for (const p of products) if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);

  return (
    <>
      <Link href={`/${access.slug}/productos`} className="flex min-h-11 w-fit items-center gap-1 text-[15px] text-muted">
        ‹ Productos
      </Link>
      <PageHeader eyebrow="Catálogo" title="Categorías" description="Así se ordenan en tu catálogo. Usá las flechas para mover." />
      {categories.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">Todavía no hay categorías.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {categories.map((category, index) => {
            const count = counts.get(category.id) ?? 0;
            return (
              <li key={category.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 pl-4">
                <Link href={`/${access.slug}/categorias/${category.id}`} className="flex min-w-0 flex-1 flex-col py-1">
                  <span className="truncate text-[16px] font-semibold">{category.name}</span>
                  {category.is_visible ? (
                    <span className="text-[14px] text-muted">{count === 1 ? "1 producto" : `${count} productos`}</span>
                  ) : (
                    <span className="text-[14px] font-semibold text-danger">Oculta en el catálogo</span>
                  )}
                </Link>
                <div className="flex gap-1.5">
                  <form action={moveCategoryAction.bind(null, access.slug, category.id, "up")}>
                    <button type="submit" disabled={index === 0} aria-label={`Subir ${category.name}`} className="grid size-11 place-items-center rounded-xl border border-line text-[15px] disabled:opacity-30">
                      ▲
                    </button>
                  </form>
                  <form action={moveCategoryAction.bind(null, access.slug, category.id, "down")}>
                    <button type="submit" disabled={index === categories.length - 1} aria-label={`Bajar ${category.name}`} className="grid size-11 place-items-center rounded-xl border border-line text-[15px] disabled:opacity-30">
                      ▼
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href={`/${access.slug}/categorias/nueva`}
        className="flex min-h-14 items-center justify-center rounded-2xl border-2 border-dashed border-line font-semibold text-accent"
      >
        + Nueva categoría
      </Link>
    </>
  );
}
