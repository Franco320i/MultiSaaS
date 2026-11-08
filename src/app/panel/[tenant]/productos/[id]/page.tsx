import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeleteButton, getProduct, listCategories, ProductForm } from "@/modules/catalog";
import { deleteProductAction, updateProductAction } from "@/modules/catalog/actions";

export const metadata: Metadata = { title: "Editar producto" };

export default function EditProductPage({ params }: PageProps<"/panel/[tenant]/productos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-8">
      <Suspense fallback={<p className="opacity-70">Cargando…</p>}>
        <EditProduct params={params} />
      </Suspense>
    </main>
  );
}

async function EditProduct({ params }: Pick<PageProps<"/panel/[tenant]/productos/[id]">, "params">) {
  const { tenant: slug, id } = await params;
  const access = await requireTenantAccess(slug, "catalog.write");
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createSupabaseServerClient();
  const [product, categories] = await Promise.all([
    getProduct(supabase, access.tenantId, id),
    listCategories(supabase, access.tenantId),
  ]);
  if (!product) notFound();

  return (
    <>
      <Link href={`/${access.slug}/productos`} className="text-sm underline opacity-80">
        ← Productos
      </Link>
      <h1 className="text-2xl font-semibold">Editar producto</h1>
      <ProductForm
        action={updateProductAction.bind(null, access.slug, product.id)}
        product={product}
        categories={categories}
        submitLabel="Guardar cambios"
      />
      <hr className="border-foreground/10" />
      <DeleteButton
        action={deleteProductAction.bind(null, access.slug, product.id)}
        label="Borrar producto"
        confirmMessage={`¿Borrar "${product.name}"? Esta acción no se puede deshacer.`}
      />
    </>
  );
}
