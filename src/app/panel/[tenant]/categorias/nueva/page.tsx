import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { CategoryForm } from "@/modules/catalog";
import { createCategoryAction } from "@/modules/catalog/actions";

export const metadata: Metadata = { title: "Nueva categoría" };

export default function NewCategoryPage({ params }: PageProps<"/panel/[tenant]/categorias/nueva">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-8">
      <Suspense fallback={<p className="opacity-70">Cargando…</p>}>
        <NewCategory params={params} />
      </Suspense>
    </main>
  );
}

async function NewCategory({ params }: Pick<PageProps<"/panel/[tenant]/categorias/nueva">, "params">) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug, "catalog.write");

  return (
    <>
      <Link href={`/${access.slug}/categorias`} className="text-sm underline opacity-80">
        ← Categorías
      </Link>
      <h1 className="text-2xl font-semibold">Nueva categoría</h1>
      <CategoryForm action={createCategoryAction.bind(null, access.slug)} submitLabel="Crear categoría" />
    </>
  );
}
