import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/core/admin/access";
import { listTenants, TENANT_FILTERS, type TenantFilter } from "@/core/admin/service";
import { dueLabel, formatDate, PageHeader, TenantStatusPill } from "../ui";

export const metadata: Metadata = { title: "Comercios" };

const PAGE_SIZE = 25;

const FILTER_LABEL: Record<TenantFilter, string> = {
  all: "Todos",
  trial_ending: "Prueba por vencer",
  past_due: "Pago pendiente",
  no_orders_14d: "Sin pedidos en 14 días",
  no_products: "Sin productos publicados",
  suspended: "Suspendidos",
};

// admin.tuapp.com.ar/comercios · Buscar y filtrar por excepción (diseño, sección 9).
export default function TenantsPage({ searchParams }: PageProps<"/admin/comercios">) {
  return (
    <main className="flex flex-col gap-5 px-4 py-6 md:px-8">
      <Suspense fallback={<div aria-busy="true" className="h-96 rounded-xl bg-surface" />}>
        <Tenants searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Tenants({ searchParams }: Pick<PageProps<"/admin/comercios">, "searchParams">) {
  await requirePlatformAdmin("/comercios");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const filter = (TENANT_FILTERS as readonly string[]).includes(params.filtro as string) ? (params.filtro as TenantFilter) : "all";
  const page = Math.max(1, Math.min(1000, Number(params.pagina) || 1));
  const { rows, total } = await listTenants({ search: q, filter, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const now = new Date();

  const href = (changes: Record<string, string | number | null>) => {
    const next = new URLSearchParams();
    const merged = { q, filtro: filter === "all" ? null : filter, pagina: page > 1 ? page : null, ...changes };
    for (const [k, v] of Object.entries(merged)) if (v !== null && v !== "") next.set(k, String(v));
    const s = next.toString();
    return s ? `/comercios?${s}` : "/comercios";
  };

  return (
    <>
      <PageHeader
        title="Comercios"
        subtitle={`${total} ${filter === "all" ? "en total" : FILTER_LABEL[filter].toLowerCase()}`}
        actions={
          <>
            <form action="/comercios" className="flex min-h-10 items-center gap-2 rounded-[10px] border border-line bg-surface px-3 focus-within:border-accent">
              {filter !== "all" ? <input type="hidden" name="filtro" value={filter} /> : null}
              <label htmlFor="q" className="sr-only">
                Buscar comercios
              </label>
              <input id="q" name="q" defaultValue={q} placeholder="Nombre, slug o WhatsApp" className="w-56 max-w-[50vw] bg-transparent text-[14px] outline-none placeholder:text-muted" />
            </form>
            <Link href="/alta" className="admin-btn flex min-h-10 items-center rounded-[10px] bg-accent px-4 text-[14px] font-semibold text-accent-foreground">
              Alta asistida
            </Link>
          </>
        }
      />

      <nav aria-label="Filtros" className="flex flex-wrap gap-2">
        {TENANT_FILTERS.map((f) => (
          <Link
            key={f}
            href={href({ filtro: f === "all" ? null : f, pagina: null })}
            aria-current={f === filter ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors ${
              f === filter ? "border-accent bg-surface-muted text-foreground" : "border-line text-muted hover:border-muted hover:text-foreground"
            }`}
          >
            {FILTER_LABEL[f]}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-6 py-10 text-center">
          <p className="font-semibold">{q ? `No hay comercios que coincidan con “${q}”.` : "No hay comercios en este filtro."}</p>
          <p className="text-[14px] text-muted">Bien: no hay nada para revisar acá.</p>
        </div>
      ) : (
        <>
          {/* Tabla en pantallas grandes */}
          <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
            <table className="w-full min-w-[820px] text-left text-[14px]">
              <thead className="bg-surface text-[12px] uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Comercio</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Estado</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Plan</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Vence</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Productos</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Pedidos 30 d</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Último pedido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((t) => {
                  const due = dueLabel(t.periodEnd, now);
                  return (
                    <tr key={t.id} className="transition-colors hover:bg-surface-muted">
                      <td className="px-4 py-3">
                        <Link href={`/comercios/${t.id}`} className="font-semibold hover:underline">
                          {t.name}
                        </Link>
                        <div className="font-mono text-[12px] text-muted">
                          {t.slug}
                          {t.published ? "" : " · sin publicar"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TenantStatusPill status={t.status} />
                      </td>
                      <td className="px-4 py-3 capitalize">{t.planId ?? "—"}</td>
                      <td className={`px-4 py-3 ${due.tone === "bad" ? "text-danger" : due.tone === "warn" ? "text-warning" : ""}`}>{due.text}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{t.publishedProducts}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{t.orders30d.toLocaleString("es-AR")}</td>
                      <td className="px-4 py-3 text-muted">{formatDate(t.lastOrderAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lista en el celular */}
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line md:hidden">
            {rows.map((t) => {
              const due = dueLabel(t.periodEnd, now);
              return (
                <li key={t.id}>
                  <Link href={`/comercios/${t.id}`} className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-surface-muted">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{t.name}</span>
                      <TenantStatusPill status={t.status} />
                    </span>
                    <span className="font-mono text-[12px] text-muted">{t.slug}</span>
                    <span className="text-[13px] text-muted">
                      Vence: <span className={due.tone === "bad" ? "text-danger" : due.tone === "warn" ? "text-warning" : ""}>{due.text}</span> ·{" "}
                      {t.orders30d} pedidos en 30 días
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {pages > 1 ? (
        <nav aria-label="Páginas" className="flex items-center justify-between text-[14px]">
          {page > 1 ? (
            <Link href={href({ pagina: page - 1 })} className="admin-btn rounded-[10px] border border-line px-3 py-1.5">
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-muted">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={href({ pagina: page + 1 })} className="admin-btn rounded-[10px] border border-line px-3 py-1.5">
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
