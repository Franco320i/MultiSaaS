import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requirePlatformAdmin } from "@/core/admin/access";
import { getSupportSnapshot, logSupportView } from "@/core/admin/service";
import { env } from "@/lib/env";
import { formatCents } from "@/lib/money";
import { platformUrl } from "@/lib/urls";
import { formatDateTime, Section, TenantStatusPill } from "@/app/admin/(panel)/ui";

export const metadata: Metadata = { title: "Modo soporte" };

const ORDER_STATUS: Record<string, string> = {
  new: "Nuevo",
  confirmed: "Confirmado",
  preparing: "En preparación",
  ready: "Listo",
  completed: "Entregado",
  cancelled: "Cancelado",
};
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/**
 * admin.tuapp.com.ar/comercios/[id]/soporte · Modo soporte, SOLO LECTURA (diseño,
 * sección 9). Cada carga queda en la auditoría del comercio antes de mostrar nada,
 * y el dueño la ve. La edición como soporte queda para más adelante.
 */
export default function SupportPage({ params }: PageProps<"/admin/comercios/[id]/soporte">) {
  return (
    <main className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <Suspense fallback={<div aria-busy="true" className="h-96 rounded-xl bg-surface" />}>
        <Support params={params} />
      </Suspense>
    </main>
  );
}

async function Support({ params }: Pick<PageProps<"/admin/comercios/[id]/soporte">, "params">) {
  const { id } = await params;
  const access = await requirePlatformAdmin(`/comercios/${id}/soporte`);
  if (!z.uuid().safeParse(id).success) notFound();

  // Primero se registra la entrada; si no se puede registrar, no se muestra nada.
  const logged = await logSupportView(access.userId, id);
  if (!logged.ok) notFound();
  const snap = await getSupportSnapshot(id);
  if (!snap) notFound();

  const categoryName = new Map(snap.categories.map((c) => [c.id, c.name]));
  return (
    <>
      <div role="note" className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-b border-warning/40 bg-warning/15 px-4 py-2.5 text-[14px] md:-mx-8 md:px-8">
        <span className="font-semibold text-warning">Modo soporte · solo lectura · tu entrada quedó registrada y el dueño la ve.</span>
        <Link href={`/comercios/${id}`} className="font-semibold hover:underline">
          Salir del modo soporte
        </Link>
      </div>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-[26px] font-semibold tracking-tight">{snap.settings?.display_name ?? snap.tenant.name}</h1>
        <TenantStatusPill status={snap.tenant.status} />
        <a href={platformUrl(env.ROOT_DOMAIN, snap.tenant.slug)} target="_blank" rel="noopener noreferrer" className="font-mono text-[13px] text-muted hover:underline">
          Ver catálogo público
        </a>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={`Productos (${snap.products.length})`}>
          <ul className="max-h-[480px] divide-y divide-line overflow-y-auto rounded-xl border border-line bg-surface text-[14px]">
            {snap.products.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2">
                <span>
                  {p.name} <span className="text-muted">· {p.category_id ? (categoryName.get(p.category_id) ?? "—") : "Sin categoría"}</span>
                  <span className="block text-[12px] text-muted">
                    {p.is_published ? "Publicado" : "Borrador"} · {p.is_available ? "Disponible" : "Sin stock"}
                    {p.is_featured ? " · Destacado" : ""}
                  </span>
                </span>
                <span className="font-mono tabular-nums">{formatCents(p.price)}</span>
              </li>
            ))}
            {snap.products.length === 0 ? <li className="px-4 py-3 text-muted">Todavía no cargó productos.</li> : null}
          </ul>
        </Section>

        <div className="flex flex-col gap-6">
          <Section title="Últimos pedidos">
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-[14px]">
              {snap.orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2">
                  <span>
                    <span className="font-mono">#{o.number}</span> {o.customer_name}{" "}
                    <span className="text-muted">· {ORDER_STATUS[o.status] ?? o.status} · {o.fulfillment === "delivery" ? "Envío" : "Retiro"}</span>
                  </span>
                  <span className="text-right">
                    <span className="font-mono tabular-nums">{formatCents(o.total)}</span>
                    <span className="block text-[12px] text-muted">{formatDateTime(o.created_at)}</span>
                  </span>
                </li>
              ))}
              {snap.orders.length === 0 ? <li className="px-4 py-3 text-muted">Todavía no recibió pedidos.</li> : null}
            </ul>
          </Section>

          <Section title="Configuración">
            <dl className="grid gap-2 rounded-xl border border-line bg-surface p-4 text-[14px] sm:grid-cols-2">
              <div><dt className="text-muted">WhatsApp</dt><dd className="font-mono">{snap.settings?.whatsapp_phone ?? "—"}</dd></div>
              <div><dt className="text-muted">Publicado</dt><dd>{snap.tenant.published_at ? "Sí" : "No"}</dd></div>
              <div>
                <dt className="text-muted">Entrega</dt>
                <dd>
                  {[snap.settings?.accepts_pickup ? "Retiro" : null, snap.settings?.accepts_delivery ? `Envío ${formatCents(snap.settings?.delivery_fee ?? 0)}` : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
              <div><dt className="text-muted">Pedido mínimo</dt><dd>{snap.settings?.min_order_amount ? formatCents(snap.settings.min_order_amount) : "No tiene"}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Horarios</dt>
                <dd className="font-mono text-[13px]">
                  {snap.hours.length === 0
                    ? "Sin horarios cargados"
                    : snap.hours.map((h) => `${DAYS[h.weekday]} ${h.opens_at.slice(0, 5)}–${h.closes_at.slice(0, 5)}`).join(" · ")}
                </dd>
              </div>
            </dl>
          </Section>
        </div>
      </div>
    </>
  );
}
