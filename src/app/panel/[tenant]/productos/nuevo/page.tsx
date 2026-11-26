import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormSkeleton } from "@/ui/skeleton";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTemplateKey, listCategories, ProductForm } from "@/modules/catalog";
import { createProductAction } from "@/modules/catalog/actions";

export const metadata: Metadata = { title: "Nuevo producto" };

export default function NewProductPage({ params }: PageProps<"/panel/[tenant]/productos/nuevo">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 py-5 sm:px-8">
      <Suspense fallback={<FormSkeleton />}>
        <NewProduct params={params} />
      </Suspense>
    </main>
  );
}

async function NewProduct({ params }: Pick<PageProps<"/panel/[tenant]/productos/nuevo">, "params">) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug, "catalog.write");
  const supabase = await createSupabaseServerClient();
  const [categories, templateKey] = await Promise.all([
    listCategories(supabase, access.tenantId),
    getTemplateKey(supabase, access.tenantId),
  ]);

  return (
    <>
      <Link href={`/${access.slug}/productos`} className="flex min-h-11 w-fit items-center gap-1 text-[15px] text-muted">
        ‹ Productos
      </Link>
      <h1 className="font-display text-[26px] leading-tight">Nuevo producto</h1>
      <p className="text-[15px] text-muted">Cargá el nombre y el precio. Las fotos se suman en el paso siguiente.</p>
      <ProductForm action={createProductAction.bind(null, access.slug)} categories={categories} templateKey={templateKey} submitLabel="Crear producto" />
    </>
  );
}
