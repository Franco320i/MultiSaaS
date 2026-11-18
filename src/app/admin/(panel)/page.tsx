import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/core/admin/access";
import { getOverview } from "@/core/admin/service";
import { formatCents } from "@/lib/money";
import { KpiStrip, PageHeader, Section } from "./ui";

export const metadata: Metadata = { title: "Resumen" };

// admin.tuapp.com.ar/ · Resumen: comercios por estado, cobros, pedidos y altas por semana.
export default function OverviewPage() {
  return (
    <main className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <Suspense fallback={<div aria-busy="true" className="h-64 rounded-xl bg-surface" />}>
        <Overview />
      </Suspense>
    </main>
  );
}

async function Overview() {
  await requirePlatformAdmin("/");
  const o = await getOverview();
  const total = Object.values(o.byStatus).reduce((a, b) => a + Number(b), 0);
  const change = o.ordersPrev7d > 0 ? Math.round(((o.orders7d - o.ordersPrev7d) / o.ordersPrev7d) * 100) : null;
  const maxWeek = Math.max(1, ...o.signupsByWeek.map((w) => w.count));

  return (
    <>
      <PageHeader title="Resumen" subtitle={`${total} comercios en total`} />
      <KpiStrip
        items={[
          { label: "Activos", value: o.byStatus.active ?? 0 },
          {
            label: "En prueba",
            value: o.byStatus.trial ?? 0,
            hint: o.trialsEnding7d > 0 ? `${o.trialsEnding7d} vencen en 7 días` : "ninguna vence esta semana",
            tone: o.trialsEnding7d > 0 ? "warn" : undefined,
          },
          {
            label: "Pago pendiente",
            value: o.byStatus.past_due ?? 0,
            hint: o.pastDueAmount > 0 ? `${formatCents(o.pastDueAmount)} a cobrar` : "todo al día",
            tone: o.pastDueAmount > 0 ? "warn" : undefined,
          },
          {
            label: "Suspendidos",
            value: o.byStatus.suspended ?? 0,
            hint: `${o.byStatus.cancelled ?? 0} cancelados`,
            tone: (o.byStatus.suspended ?? 0) > 0 ? "bad" : undefined,
          },
          {
            label: "Pedidos 7 días",
            value: o.orders7d.toLocaleString("es-AR"),
            hint: change === null ? "sin semana anterior para comparar" : `${change >= 0 ? "+" : ""}${change} % vs. semana anterior`,
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Section title="Altas por semana">
          <div className="rounded-xl border border-line bg-surface p-4">
            <svg viewBox={`0 0 ${o.signupsByWeek.length * 40} 120`} className="h-36 w-full" role="img" aria-label="Altas de comercios por semana">
              {o.signupsByWeek.map((w, i) => {
                const h = (w.count / maxWeek) * 84;
                return (
                  <g key={w.week}>
                    <rect x={i * 40 + 8} y={96 - h} width={24} height={Math.max(h, 1)} rx={4} fill="var(--accent)" opacity={i === o.signupsByWeek.length - 1 ? 1 : 0.55} />
                    <text x={i * 40 + 20} y={92 - h} textAnchor="middle" fontSize="11" fill="var(--muted)" className="font-mono">
                      {w.count}
                    </text>
                    <text x={i * 40 + 20} y={114} textAnchor="middle" fontSize="10" fill="var(--muted)">
                      {new Date(`${w.week}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Section>

        <Section title="Para revisar">
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
            {[
              { href: "/comercios?filtro=trial_ending", label: "Pruebas que vencen en 7 días", n: o.trialsEnding7d },
              { href: "/comercios?filtro=past_due", label: "Pago pendiente", n: o.byStatus.past_due ?? 0 },
              { href: "/comercios?filtro=no_orders_14d", label: "Sin pedidos en 14 días", n: null },
              { href: "/comercios?filtro=no_products", label: "Sin productos publicados", n: null },
              { href: "/comercios?filtro=suspended", label: "Suspendidos y cancelados", n: (o.byStatus.suspended ?? 0) + (o.byStatus.cancelled ?? 0) },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex min-h-11 items-center justify-between px-4 py-2.5 text-[14px] transition-colors hover:bg-surface-muted">
                  <span>{item.label}</span>
                  {item.n !== null ? <span className="font-mono text-muted tabular-nums">{item.n}</span> : <span aria-hidden className="text-muted">→</span>}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-muted">Renuevan en los próximos 7 días: {o.renewals7d}.</p>
        </Section>
      </div>
    </>
  );
}
