import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { platformUrl } from "@/lib/urls";
import { countProducts } from "@/modules/catalog";
import { getOrderStats, OrderStatsCard } from "@/modules/orders";
import { getSetupStatus, SetupChecklist } from "@/modules/settings";

export const metadata: Metadata = { title: "Inicio" };

const STATUS_LABEL = {
  trial: "Período de prueba",
  active: "Activo",
  past_due: "Pago pendiente",
  suspended: "Suspendido",
  cancelled: "Cancelado",
} as const;

// app.tuapp.com.ar/[tenant] · Inicio del panel de un comercio (estilo Sobremesa).
// Arriba, lo que vendió este mes; después, lo que le falta (al dueño) y los accesos.
export default function TenantHome({ params }: PageProps<"/panel/[tenant]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
      <Suspense fallback={<HomeSkeleton />}>
        <TenantDashboard params={params} />
      </Suspense>
    </main>
  );
}

async function TenantDashboard({ params }: Pick<PageProps<"/panel/[tenant]">, "params">) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug, "panel.view");
  const supabase = await createSupabaseServerClient();
  const [productCount, stats, tenant, setup] = await Promise.all([
    countProducts(supabase, access.tenantId),
    getOrderStats(supabase, access.tenantId),
    supabase.from("tenants").select("published_at").eq("id", access.tenantId).maybeSingle(),
    access.role === "owner" ? getSetupStatus(supabase, access.tenantId) : Promise.resolve(null),
  ]);
  const catalogUrl = tenant.data?.published_at ? platformUrl(env.ROOT_DOMAIN, access.slug) : null;
  const newOrders = stats?.newOrders ?? 0;

  const links = [
    {
      href: `/${access.slug}/pedidos`,
      label: "Pedidos",
      detail: newOrders > 0 ? `${newOrders} ${newOrders === 1 ? "nuevo" : "nuevos"} sin atender` : "Los que llegan desde tu catálogo",
      highlight: newOrders > 0,
    },
    { href: `/${access.slug}/productos`, label: "Productos", detail: productCount === 1 ? "1 cargado" : `${productCount} cargados`, highlight: false },
    { href: `/${access.slug}/categorias`, label: "Categorías", detail: "Ordená y agrupá tu catálogo", highlight: false },
    ...(access.role === "owner"
      ? [{ href: `/${access.slug}/ajustes`, label: "Ajustes", detail: "Marca, contacto, horarios y envíos", highlight: false }]
      : []),
  ];

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] leading-tight text-balance">{access.name}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-muted">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
              access.status === "past_due" || access.status === "suspended"
                ? "bg-danger-soft text-danger"
                : "bg-surface-muted text-foreground"
            }`}
          >
            {STATUS_LABEL[access.status]}
          </span>
          <span>{access.role === "owner" ? "Dueño" : "Staff"}</span>
          {catalogUrl ? (
            <a href={catalogUrl} target="_blank" rel="noopener noreferrer" className="py-2 font-semibold text-foreground underline underline-offset-4">
              Ver mi catálogo
            </a>
          ) : null}
        </p>
      </header>

      {stats ? <OrderStatsCard stats={stats} catalogUrl={catalogUrl} /> : null}

      {setup ? <SetupChecklist slug={access.slug} status={setup} /> : null}

      <nav aria-label="Secciones del panel">
        <ul className="flex flex-col divide-y divide-line rounded-2xl bg-surface">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="flex min-h-16 items-center justify-between gap-4 px-5 py-3 hover:bg-surface-muted/60">
                <span className="flex min-w-0 flex-col">
                  <span className="text-[17px] font-semibold">{link.label}</span>
                  <span className={`text-[15px] ${link.highlight ? "font-semibold text-accent" : "text-muted"}`}>{link.detail}</span>
                </span>
                <span aria-hidden className="text-[22px] text-muted">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-56 rounded-lg bg-surface-muted" />
        <div className="h-5 w-40 rounded-full bg-surface-muted" />
      </div>
      <div className="h-32 rounded-2xl bg-surface-muted" />
      <div className="h-64 rounded-2xl bg-surface-muted" />
    </div>
  );
}
