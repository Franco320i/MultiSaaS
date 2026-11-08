import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countProducts } from "@/modules/catalog";

export const metadata: Metadata = { title: "Inicio" };

const STATUS_LABEL = {
  trial: "Período de prueba",
  active: "Activo",
  past_due: "Pago pendiente",
  suspended: "Suspendido",
  cancelled: "Cancelado",
} as const;

// app.tuapp.com.ar/[tenant] · Inicio del panel de un comercio.
// Etapa 3: solo verifica el acceso y muestra el comercio. Las secciones llegan después.
export default function TenantHome({ params }: PageProps<"/panel/[tenant]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <Suspense fallback={<p className="opacity-70">Cargando…</p>}>
        <TenantDashboard params={params} />
      </Suspense>
    </main>
  );
}

async function TenantDashboard({ params }: Pick<PageProps<"/panel/[tenant]">, "params">) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug, "panel.view");
  const supabase = await createSupabaseServerClient();
  const productCount = await countProducts(supabase, access.tenantId);

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-sm uppercase tracking-wide opacity-60">Panel del comercio</p>
        <h1 className="text-3xl font-semibold">{access.name}</h1>
        <p className="text-sm opacity-70">
          {access.role === "owner" ? "Dueño" : "Staff"} · {STATUS_LABEL[access.status]}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={`/${access.slug}/productos`} className="rounded-md border border-foreground/15 px-4 py-3 hover:bg-foreground/5">
          <span className="block font-medium">Productos</span>
          <span className="text-sm opacity-70">{productCount} cargados</span>
        </Link>
        <Link href={`/${access.slug}/categorias`} className="rounded-md border border-foreground/15 px-4 py-3 hover:bg-foreground/5">
          <span className="block font-medium">Categorías</span>
          <span className="text-sm opacity-70">Ordená y agrupá tu catálogo</span>
        </Link>
      </div>
      <ul className="flex flex-col gap-1 text-sm opacity-60">
        <li>Fotos de productos — etapa 5</li>
        <li>Pedidos — etapa 7</li>
        {access.role === "owner" && <li>Configuración, horarios y equipo — próximas etapas</li>}
      </ul>
    </>
  );
}
