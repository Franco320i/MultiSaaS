import type { Metadata } from "next";
import { Pill } from "@/ui/pill";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { platformUrl } from "@/lib/urls";
import { listProducts, productCounts } from "@/modules/catalog";
import { describeOrderStats, getOrderStats } from "@/modules/orders";
import { PageHeader } from "@/ui/page-header";
import { CatalogLinkCard } from "./_components/catalog-link-card";
import { HomeStats } from "./_components/home-stats";

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
  const [stats, tenant, products] = await Promise.all([
    getOrderStats(supabase, access.tenantId),
    supabase.from("tenants").select("published_at").eq("id", access.tenantId).maybeSingle(),
    listProducts(supabase, access.tenantId),
  ]);
  const catalogUrl = tenant.data?.published_at ? platformUrl(env.ROOT_DOMAIN, access.slug) : null;
  const newOrders = stats?.newOrders ?? 0;
  const text = stats ? describeOrderStats(stats) : null;
  const counts = productCounts(products);
  const month = text?.monthLabel.toLowerCase() ?? "este mes";

  const actions = [
    { href: `/${access.slug}/productos/nuevo`, label: "Cargar producto", detail: "Con foto y precio", icon: "plus" as const },
    { href: `/${access.slug}/productos`, label: "Precios y stock", detail: "Cambialos rápido", icon: "list" as const },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Tu local"
        title={access.name}
        description={`Cómo va ${month}.`}
        action={
          access.status === "past_due" || access.status === "suspended" || access.status === "trial" ? (
            <Pill tone={access.status === "trial" ? "neutral" : "danger"}>{STATUS_LABEL[access.status]}</Pill>
          ) : null
        }
      />

      {newOrders > 0 ? (
        <Link href={`/${access.slug}/pedidos`} className="flex items-center gap-4 rounded-2xl bg-warning-soft p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-danger text-[17px] font-bold text-background">{newOrders}</span>
          <span className="flex flex-col">
            <span className="text-[17px] font-semibold">{newOrders === 1 ? "Tenés un pedido nuevo" : `Tenés ${newOrders} pedidos nuevos`}</span>
            <span className="text-[14px] text-muted">Tocá para verlos y confirmarlos</span>
          </span>
        </Link>
      ) : null}

      <HomeStats
        slug={access.slug}
        monthOrders={stats?.monthOrders ?? 0}
        change={text?.change ?? null}
        monthTotal={stats?.monthTotal ?? 0}
        productsTotal={counts.all}
        outOfStock={counts.outOfStock}
        topProduct={stats?.topProduct ?? null}
      />

      <CatalogLinkCard slug={access.slug} url={catalogUrl} canPublish={access.role === "owner"} />

      <ul className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <li key={action.label}>
            <Link
              href={action.href}
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-3 hover:border-accent"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <ActionIcon name={action.icon} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] leading-tight font-semibold">{action.label}</span>
                <span className="text-[12px] text-muted">{action.detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
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

function ActionIcon({ name }: { name: "plus" | "list" | "open" | "share" }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    list: <path d="M4 7h16M4 12h10M4 17h7" />,
    open: <path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
    share: (
      <>
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-6">
      {paths[name]}
    </svg>
  );
}
