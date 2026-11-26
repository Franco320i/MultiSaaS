import type { Metadata } from "next";
import { Pill } from "@/ui/pill";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { platformUrl } from "@/lib/urls";
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
  const [stats, tenant, setup] = await Promise.all([
    getOrderStats(supabase, access.tenantId),
    supabase.from("tenants").select("published_at").eq("id", access.tenantId).maybeSingle(),
    access.role === "owner" ? getSetupStatus(supabase, access.tenantId) : Promise.resolve(null),
  ]);
  const catalogUrl = tenant.data?.published_at ? platformUrl(env.ROOT_DOMAIN, access.slug) : null;
  const newOrders = stats?.newOrders ?? 0;

  const actions = [
    { href: `/${access.slug}/productos/nuevo`, label: "Cargar producto", detail: "Con foto y precio", icon: "plus" as const },
    { href: `/${access.slug}/productos`, label: "Precios y stock", detail: "Cambialos rápido", icon: "list" as const },
    ...(catalogUrl ? [{ href: catalogUrl, label: "Ver mi catálogo", detail: "Como lo ven tus clientes", icon: "open" as const, external: true }] : []),
    ...(access.role === "owner"
      ? [{ href: `/${access.slug}/configurar?paso=publicar`, label: "Compartir", detail: "Link y código QR", icon: "share" as const }]
      : []),
  ];

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] leading-tight text-balance">{access.name}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-muted">
          <Pill tone={access.status === "past_due" || access.status === "suspended" ? "danger" : "neutral"}>
            {STATUS_LABEL[access.status]}
          </Pill>
          <span>{access.role === "owner" ? "Dueño" : "Staff"}</span>
        </p>
      </header>

      {newOrders > 0 ? (
        <Link
          href={`/${access.slug}/pedidos`}
          className="flex items-center gap-4 rounded-2xl bg-surface-muted p-4"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-danger text-[17px] font-bold text-background">{newOrders}</span>
          <span className="flex flex-col">
            <span className="text-[17px] font-semibold">{newOrders === 1 ? "Tenés un pedido nuevo" : `Tenés ${newOrders} pedidos nuevos`}</span>
            <span className="text-[14px] text-muted">Tocá para verlos y confirmarlos</span>
          </span>
        </Link>
      ) : null}

      {stats ? <OrderStatsCard stats={stats} catalogUrl={catalogUrl} /> : null}


      <ul className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <li key={action.label}>
            <Link
              href={action.href}
              {...("external" in action ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex min-h-28 flex-col gap-2 rounded-2xl border border-line bg-surface p-4 hover:border-accent"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-surface-muted text-accent">
                <ActionIcon name={action.icon} />
              </span>
              <span className="text-[16px] leading-tight font-semibold">{action.label}</span>
              <span className="-mt-1 text-[13px] text-muted">{action.detail}</span>
            </Link>
          </li>
        ))}
      </ul>

      {setup ? <SetupChecklist slug={access.slug} status={setup} /> : null}
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
