import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/images/url";
import { DeleteButton, getProduct, getTemplateKey, listCategories, listProductImages, ProductForm, ProductImages } from "@/modules/catalog";
import {
  deleteProductAction,
  deleteProductImageAction,
  moveProductImageAction,
  updateProductAction,
  uploadProductImageAction,
} from "@/modules/catalog/actions";

export const metadata: Metadata = { title: "Editar producto" };

export default function EditProductPage({ params, searchParams }: PageProps<"/panel/[tenant]/productos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 py-5 sm:px-8">
      <Suspense fallback={<div aria-hidden className="h-96 rounded-2xl bg-surface-muted" />}>
        <EditProduct params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function EditProduct({ params, searchParams }: PageProps<"/panel/[tenant]/productos/[id]">) {
  const { tenant: slug, id } = await params;
  const { nuevo } = await searchParams;
  const access = await requireTenantAccess(slug, "catalog.write");
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createSupabaseServerClient();
  const [product, categories, images, templateKey] = await Promise.all([
    getProduct(supabase, access.tenantId, id),
    listCategories(supabase, access.tenantId),
    listProductImages(supabase, access.tenantId, id),
    getTemplateKey(supabase, access.tenantId),
  ]);
  if (!product) notFound();

  return (
    <>
      <Link href={`/${access.slug}/productos`} className="flex min-h-11 w-fit items-center gap-1 text-[15px] text-muted">
        ‹ Productos
      </Link>
      <h1 className="font-display text-[26px] leading-tight text-balance">{product.name}</h1>
      {nuevo ? (
        <p role="status" className="rounded-2xl bg-surface-muted px-4 py-3 text-[15px] font-semibold">
          Listo, el producto está creado. Ahora sumale una foto: es lo que más vende.
        </p>
      ) : null}
      <section aria-label="Fotos" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <ProductImages
          productName={product.name}
          images={images.map((image) => ({
            id: image.id,
            url: publicImageUrl(image.storage_path, 480),
            width: image.width,
            height: image.height,
          }))}
          uploadAction={uploadProductImageAction.bind(null, access.slug, product.id)}
          deleteAction={deleteProductImageAction.bind(null, access.slug)}
          moveAction={moveProductImageAction.bind(null, access.slug)}
        />
      </section>
      <ProductForm
        action={updateProductAction.bind(null, access.slug, product.id)}
        product={product}
        categories={categories}
        templateKey={templateKey}
        submitLabel="Guardar cambios"
      />
      <div className="pt-4">
        <DeleteButton
          action={deleteProductAction.bind(null, access.slug, product.id)}
          label="Borrar producto"
          confirmMessage={`¿Borrar "${product.name}"? Esta acción no se puede deshacer.`}
        />
      </div>
    </>
  );
}
