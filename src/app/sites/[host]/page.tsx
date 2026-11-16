import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getStorefront } from "@/core/tenancy/storefront";
import { getPublicCatalog, StorefrontSkeleton, StorefrontUnavailable, StorefrontView } from "@/modules/catalog";

/**
 * Catálogo público: [slug].tuapp.com.ar → /sites/{host} (solo por reescritura del proxy).
 * Diseño, secciones 7 y 12.
 *
 * - El comercio sale del host de la ruta, nunca de algo que mande el navegador.
 * - Sin sesión ni cookies: getStorefront y getPublicCatalog son funciones cacheadas
 *   con el host o el tenantId como argumento (el comercio siempre en la clave).
 * - `params` se lee dentro de <Suspense> (Next 16): la cáscara estática es solo el
 *   esqueleto, sin datos de ningún comercio.
 */

type Props = PageProps<"/sites/[host]">;

async function hostFrom(params: Props["params"]): Promise<string> {
  const { host } = await params;
  return decodeURIComponent(host);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const storefront = await getStorefront(await hostFrom(params));
  if (!storefront) return { title: "Catálogo no encontrado", robots: { index: false } };
  if (!storefront.available) return { title: "Catálogo no disponible", robots: { index: false } };
  return {
    title: storefront.display_name,
    description: storefront.tagline ?? storefront.description ?? `Catálogo de ${storefront.display_name}`,
  };
}

export default function StorefrontPage({ params }: Props) {
  return (
    <Suspense fallback={<StorefrontSkeleton />}>
      <Storefront params={params} />
    </Suspense>
  );
}

async function Storefront({ params }: Pick<Props, "params">) {
  const storefront = await getStorefront(await hostFrom(params));
  if (!storefront) notFound();
  if (!storefront.available) return <StorefrontUnavailable />;

  const catalog = await getPublicCatalog(storefront.tenant_id);
  return <StorefrontView storefront={storefront} catalog={catalog} />;
}
