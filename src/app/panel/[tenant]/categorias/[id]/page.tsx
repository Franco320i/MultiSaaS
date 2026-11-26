import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton } from "@/ui/skeleton";
import { z } from "zod";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CategoryForm, DeleteButton, getCategory } from "@/modules/catalog";
import { deleteCategoryAction, updateCategoryAction } from "@/modules/catalog/actions";

export const metadata: Metadata = { title: "Editar categoría" };

export default function EditCategoryPage({ params }: PageProps<"/panel/[tenant]/categorias/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-8">
      <Suspense fallback={<FormSkeleton />}>
        <EditCategory params={params} />
      </Suspense>
    </main>
  );
}

async function EditCategory({ params }: Pick<PageProps<"/panel/[tenant]/categorias/[id]">, "params">) {
  const { tenant: slug, id } = await params;
  const access = await requireTenantAccess(slug, "catalog.write");
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createSupabaseServerClient();
  const category = await getCategory(supabase, access.tenantId, id);
  if (!category) notFound();

  return (
    <>
      <Link href={`/${access.slug}/categorias`} className="text-sm underline opacity-80">
        ← Categorías
      </Link>
      <h1 className="text-2xl font-semibold">Editar categoría</h1>
      <CategoryForm
        action={updateCategoryAction.bind(null, access.slug, category.id)}
        category={category}
        submitLabel="Guardar cambios"
      />
      <hr className="border-foreground/10" />
      <DeleteButton
        action={deleteCategoryAction.bind(null, access.slug, category.id)}
        label="Borrar categoría"
        confirmMessage={`¿Borrar "${category.name}"? Sus productos no se borran: quedan sin categoría.`}
      />
    </>
  );
}
