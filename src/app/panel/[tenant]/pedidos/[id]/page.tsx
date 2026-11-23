import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { formatCents } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dayAndTime, getOrder, getTenantTimeZone, StatusActions, StatusPill } from "@/modules/orders";
import { setOrderStatusAction } from "@/modules/orders/actions";

export const metadata: Metadata = { title: "Pedido" };

// app.tuapp.com.ar/[tenant]/pedidos/[id] · Detalle de un pedido.
export default function OrderPage({ params }: PageProps<"/panel/[tenant]/pedidos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
      <Suspense fallback={<div aria-busy="true" className="h-64 rounded-2xl bg-surface-muted" />}>
        <Order params={params} />
      </Suspense>
    </main>
  );
}

async function Order({ params }: Pick<PageProps<"/panel/[tenant]/pedidos/[id]">, "params">) {
  const { tenant: slug, id } = await params;
  const access = await requireTenantAccess(slug, "orders.manage");
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createSupabaseServerClient();
  const [order, timeZone] = await Promise.all([
    getOrder(supabase, access.tenantId, id),
    getTenantTimeZone(supabase, access.tenantId),
  ]);
  if (!order) notFound();

  // Link a WhatsApp del cliente solo si dejó el número con código de país (+54…).
  const phoneDigits = order.customerPhone.replace(/\D/g, "");
  const customerWhatsapp = order.customerPhone.trim().startsWith("+") ? `https://wa.me/${phoneDigits}` : null;

  return (
    <>
      <Link href={`/${access.slug}/pedidos`} className="w-fit py-2 text-[15px] font-semibold text-muted hover:text-foreground">
        ← Pedidos
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[32px] leading-tight tabular-nums">Pedido #{order.number}</h1>
          <StatusPill status={order.status} />
        </div>
        <p className="text-[15px] text-muted">Recibido el {dayAndTime(order.createdAt, timeZone)}</p>
      </header>

      <StatusActions status={order.status} action={setOrderStatusAction.bind(null, access.slug, order.id)} />

      <section aria-labelledby="cliente" className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
        <h2 id="cliente" className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          Cliente
        </h2>
        <p className="text-[17px] font-semibold">{order.customerName}</p>
        <p className="flex flex-wrap gap-x-4">
          <a href={`tel:${order.customerPhone.replace(/[^\d+]/g, "")}`} className="py-1 font-semibold underline underline-offset-4">
            {order.customerPhone}
          </a>
          {customerWhatsapp ? (
            <a href={customerWhatsapp} target="_blank" rel="noopener noreferrer" className="py-1 font-semibold underline underline-offset-4">
              Escribirle por WhatsApp
            </a>
          ) : null}
        </p>
        <p className="text-[15px]">
          {order.fulfillment === "delivery" ? (
            <>
              <span className="font-semibold">Envío a:</span> {order.deliveryAddress}
            </>
          ) : (
            <span className="font-semibold">Retira en el local</span>
          )}
        </p>
        {order.notes ? (
          <p className="mt-2 rounded-xl bg-surface-muted px-3 py-2 text-[15px]">
            <span className="font-semibold">Notas:</span> {order.notes}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="productos" className="flex flex-col gap-2">
        <h2 id="productos" className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          Productos
        </h2>
        <ul className="divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-baseline gap-3 py-3 tabular-nums">
              <span className="w-10 font-semibold">{item.quantity} ×</span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{item.productName}</span>
                {item.options ? <span className="block text-[15px]">{item.options}</span> : null}
                <span className="block text-[14px] text-muted">{formatCents(item.unitPrice)} c/u</span>
              </span>
              <span className="font-semibold">{formatCents(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 border-t border-line pt-3 text-[15px] tabular-nums">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{formatCents(order.subtotal)}</dd>
          </div>
          {order.fulfillment === "delivery" ? (
            <div className="flex justify-between">
              <dt className="text-muted">Envío</dt>
              <dd>{formatCents(order.deliveryFee)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-[18px] font-semibold">
            <dt>Total</dt>
            <dd>{formatCents(order.total)}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
