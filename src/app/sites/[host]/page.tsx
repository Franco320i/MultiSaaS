import { Suspense } from "react";

// [slug].tuapp.com.ar · Solo accesible por reescritura desde el proxy (/sites/{host}).
// Etapa 1: solo muestra el host recibido. En la etapa 6 se resuelve el comercio
// con `storefront_by_host` y se cachea por host.
export default function StorefrontPage({ params }: PageProps<"/sites/[host]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 p-8">
      <p className="text-sm uppercase tracking-wide opacity-60">Catálogo público</p>
      <Suspense fallback={<h1 className="text-3xl font-semibold">Cargando…</h1>}>
        <StorefrontHost params={params} />
      </Suspense>
      <p className="opacity-80">
        Página provisoria. Todavía no se consulta la base: se muestra el host que llegó.
      </p>
    </main>
  );
}

async function StorefrontHost({ params }: Pick<PageProps<"/sites/[host]">, "params">) {
  const { host } = await params;
  return <h1 className="text-3xl font-semibold">Catálogo de {decodeURIComponent(host)}</h1>;
}
