import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCategories } from "@/modules/catalog";
import { moveCategoryAction } from "@/modules/catalog/actions";

export const metadata: Metadata = { title: "Categorías" };

export default function CategoriesPage({ params }: PageProps<"/panel/[tenant]/categorias">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <Suspense fallback={<p className="opacity-70">Cargando…</p>}>
        <CategoryList params={params} />
      </Suspense>
    </main>
  );
}

async function CategoryList({ params }: Pick<PageProps<"/panel/[tenant]/categorias">, "params">) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug, "catalog.write");
  const supabase = await createSupabaseServerClient();
  const categories = await listCategories(supabase, access.tenantId);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categorías</h1>
        <Link href={`/${access.slug}/categorias/nueva`} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
          Nueva categoría
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="opacity-70">Todavía no hay categorías.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/15">
          {categories.map((category, index) => (
            <li key={category.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col">
                <form action={moveCategoryAction.bind(null, access.slug, category.id, "up")}>
                  <button type="submit" disabled={index === 0} aria-label={`Subir ${category.name}`} className="px-1 text-xs disabled:opacity-20">
                    ▲
                  </button>
                </form>
                <form action={moveCategoryAction.bind(null, access.slug, category.id, "down")}>
                  <button type="submit" disabled={index === categories.length - 1} aria-label={`Bajar ${category.name}`} className="px-1 text-xs disabled:opacity-20">
                    ▼
                  </button>
                </form>
              </div>
              <div className="flex flex-1 flex-col">
                <span className="font-medium">{category.name}</span>
                {!category.is_visible && <span className="text-xs opacity-60">Oculta en el catálogo</span>}
              </div>
              <Link href={`/${access.slug}/productos?categoria=${category.id}`} className="text-sm underline opacity-80">
                Ver productos
              </Link>
              <Link href={`/${access.slug}/categorias/${category.id}`} className="text-sm underline">
                Editar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
