import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { ImportForm } from "@/modules/catalog";
import { importProductsAction, previewImportAction } from "@/modules/catalog/actions";

export const metadata: Metadata = { title: "Importar productos" };

// app.tuapp.com.ar/[tenant]/productos/importar · Pegar productos desde una planilla.
export default function ImportPage({ params }: PageProps<"/panel/[tenant]/productos/importar">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<div aria-busy="true" className="h-64 rounded-2xl bg-surface-muted" />}>
        <Import params={params} />
      </Suspense>
    </main>
  );
}

async function Import({ params }: Pick<PageProps<"/panel/[tenant]/productos/importar">, "params">) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug, "catalog.write");
  return (
    <>
      <Link href={`/${access.slug}/productos`} className="w-fit py-2 text-[15px] font-semibold text-muted hover:text-foreground">
        ← Productos
      </Link>
      <h1 className="font-display text-[32px] leading-tight">Importar productos</h1>
      <ImportForm
        previewAction={previewImportAction.bind(null, access.slug)}
        importAction={importProductsAction.bind(null, access.slug)}
        productsHref={`/${access.slug}/productos`}
      />
    </>
  );
}
