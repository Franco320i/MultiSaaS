import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { formatCents } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  clockTime,
  FulfillmentLabel,
  getTenantTimeZone,
  listOrders,
  OrdersAutoRefresh,
  StatusActions,
  StatusPill,
  timeAgo,
  type OrderListItem,
} from "@/modules/orders";
import { setOrderStatusAction } from "@/modules/orders/actions";

export const metadata: Metadata = { title: "Pedidos" };

/**
 * app.tuapp.com.ar/[tenant]/pedidos · Pedidos del comercio (diseño, sección 11).
 * "En curso": nuevos primero, después confirmados, en preparación y listos; dentro de
 * cada grupo, el más viejo arriba. Se actualiza sola cada 20 segundos.
 */
export default function OrdersPage({ params, searchParams }: PageProps<"/panel/[tenant]/pedidos">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
      <Suspense fallback={<OrdersSkeleton />}>
        <Orders params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const GROUPS = [
  { status: "new", title: "Nuevos" },
  { status: "confirmed", title: "Confirmados" },
  { status: "preparing", title: "En preparación" },
  { status: "ready", title: "Listos para entregar" },
] as const;

async function Orders({ params, searchParams }: PageProps<"/panel/[tenant]/pedidos">) {
  const { tenant: slug } = await params;
  const { ver } = await searchParams;
  const access = await requireTenantAccess(slug, "orders.manage");
  const supabase = await createSupabaseServerClient();
  const view = ver === "terminados" ? "closed" : "open";

  const [orders, timeZone] = await Promise.all([
    listOrders(supabase, access.tenantId, view),
    getTenantTimeZone(supabase, access.tenantId),
  ]);
  const newCount = view === "open" ? orders.filter((o) => o.status === "new").length : 0;
  const now = new Date();
  const base = `/${access.slug}/pedidos`;

  const row = (order: OrderListItem, withActions: boolean) => (
    <OrderRow
      key={order.id}
      order={order}
      href={`${base}/${order.id}`}
      timeZone={timeZone}
      now={now}
      actions={
        withActions ? (
          <StatusActions status={order.status} action={setOrderStatusAction.bind(null, access.slug, order.id)} compact />
        ) : null
      }
    />
  );

  return (
    <>
      <OrdersAutoRefresh newCount={newCount} title="Pedidos · Panel" />
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[28px] leading-tight">Pedidos</h1>
        <nav aria-label="Ver pedidos" className="flex gap-6 border-b border-line text-[15px]">
          {[
            { href: base, label: "En curso", active: view === "open" },
            { href: `${base}?ver=terminados`, label: "Terminados", active: view === "closed" },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={`border-b-2 py-3 ${tab.active ? "border-accent font-semibold" : "border-transparent text-muted hover:text-foreground"}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-col gap-2 py-12 text-center">
          <p className="font-display text-[22px]">
            {view === "open" ? "No hay pedidos en curso" : "Todavía no hay pedidos terminados"}
          </p>
          <p className="text-muted">
            {view === "open"
              ? "Cuando un cliente pida desde tu catálogo, el pedido aparece acá y te llega por WhatsApp."
              : "Acá vas a ver los pedidos entregados y cancelados."}
          </p>
        </div>
      ) : view === "open" ? (
        GROUPS.map((group) => {
          const items = orders.filter((o) => o.status === group.status);
          if (items.length === 0) return null;
          return (
            <section key={group.status} aria-labelledby={`g-${group.status}`} className="flex flex-col gap-1">
              <h2 id={`g-${group.status}`} className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                {group.title} · {items.length}
              </h2>
              <ul className="divide-y divide-line">{items.map((o) => row(o, true))}</ul>
            </section>
          );
        })
      ) : (
        <ul className="divide-y divide-line">{orders.map((o) => row(o, false))}</ul>
      )}
    </>
  );
}

function OrderRow({
  order,
  href,
  timeZone,
  now,
  actions,
}: {
  order: OrderListItem;
  href: string;
  timeZone: string;
  now: Date;
  actions: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
      {/* En el celular el botón del paso siguiente baja a su propia línea. */}
      <Link href={href} className="flex min-w-0 flex-1 basis-full items-center gap-4 rounded-lg sm:basis-auto">
        <span className="w-14 shrink-0 font-display text-[24px] tabular-nums">#{order.number}</span>
        <span className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[17px] font-semibold">{order.customerName}</span>
            <StatusPill status={order.status} />
          </span>
          <span className="text-[14px] text-muted tabular-nums">
            {order.itemCount} {order.itemCount === 1 ? "producto" : "productos"} · <FulfillmentLabel fulfillment={order.fulfillment} /> ·{" "}
            {formatCents(order.total)} · {clockTime(order.createdAt, timeZone)} ({timeAgo(order.createdAt, now)})
          </span>
        </span>
      </Link>
      {actions}
    </li>
  );
}

function OrdersSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando los pedidos" className="flex flex-col gap-4">
      <div className="h-8 w-40 rounded-full bg-surface-muted" />
      <div className="h-10 border-b border-line" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <div className="h-7 w-12 rounded-full bg-surface-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-1/2 rounded-full bg-surface-muted" />
            <div className="h-3 w-3/4 rounded-full bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
