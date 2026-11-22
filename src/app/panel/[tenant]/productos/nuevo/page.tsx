import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTemplateKey, listCategories, ProductForm } from "@/modules/catalog";
import { createProductAction } from "@/modules/catalog/actions";

export const metadata: Metadata = { title: "Nuevo producto" };

export default function NewProductPage({ params }: PageProps<"/panel/[tenant]/productos/nuevo">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-8">
      <Suspense fallback={<p className="opacity-70">Cargando…</p>}>
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
      <Link href={`/${access.slug}/productos`} className="text-sm underline opacity-80">
        ← Productos
      </Link>
      <h1 className="text-2xl font-semibold">Nuevo producto</h1>
      <ProductForm action={createProductAction.bind(null, access.slug)} categories={categories} templateKey={templateKey} submitLabel="Crear producto" />
    </>
  );
}
