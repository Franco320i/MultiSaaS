import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requirePlatformAdmin } from "@/core/admin/access";
import { getTenantDetail } from "@/core/admin/service";
import { env } from "@/lib/env";
import { formatCents } from "@/lib/money";
import { platformUrl } from "@/lib/urls";
import { changePlanAction, extendPeriodAction, recordPaymentAction, setStatusAction } from "@/app/admin/(panel)/actions";
import { AdminForm, adminInput } from "@/app/admin/(panel)/admin-form";
import { ACTION_LABEL, ACTOR_LABEL, dueLabel, formatDate, formatDateTime, PageHeader, Section, TenantStatusPill } from "@/app/admin/(panel)/ui";

export const metadata: Metadata = { title: "Ficha del comercio" };

const METHOD_LABEL: Record<string, string> = { mp_link: "Link de Mercado Pago", transfer: "Transferencia", cash: "Efectivo", other: "Otro" };

// admin.tuapp.com.ar/comercios/[id] · Ficha: datos, suscripción, pagos, miembros, auditoría y acciones.
export default function TenantPage({ params }: PageProps<"/admin/comercios/[id]">) {
  return (
    <main className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <Suspense fallback={<div aria-busy="true" className="h-96 rounded-xl bg-surface" />}>
        <Tenant params={params} />
      </Suspense>
    </main>
  );
}

async function Tenant({ params }: Pick<PageProps<"/admin/comercios/[id]">, "params">) {
  const { id } = await params;
  const access = await requirePlatformAdmin(`/comercios/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const detail = await getTenantDetail(id);
  if (!detail) notFound();

  const { tenant, settings, subscription } = detail;
  const plan = subscription?.plans as unknown as { name: string; price_ars: number } | null;
  const due = dueLabel(subscription?.current_period_end ?? null, new Date());
  const isSuperadmin = access.role === "superadmin";
  const catalogUrl = platformUrl(env.ROOT_DOMAIN, tenant.slug);
  const field = "flex flex-col gap-1 text-[13px] font-semibold text-muted";

  return (
    <>
      <Link href="/comercios" className="w-fit text-[14px] font-semibold text-muted hover:text-foreground">
        ← Comercios
      </Link>
      <PageHeader
        title={tenant.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <TenantStatusPill status={tenant.status} />
            <a href={catalogUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[13px] hover:underline">
              {catalogUrl.replace(/^https?:\/\//, "")}
            </a>
            <span>· alta {formatDate(tenant.created_at)}</span>
            <span>· {tenant.published_at ? "publicado" : "sin publicar"}</span>
          </span>
        }
        actions={
          // <a> y no <Link>: Next no la precarga, así cada entrada auditada es una entrada real.
          <a href={`/comercios/${tenant.id}/soporte`} className="admin-btn flex min-h-10 items-center rounded-[10px] border border-line bg-surface-muted px-4 text-[14px] font-semibold">
            Ver como soporte
          </a>
        }
      />
      {tenant.status_reason ? (
        <p className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-[14px] text-danger">Motivo: {tenant.status_reason}</p>
      ) : null}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        {[
          { label: "Plan", value: plan ? `${plan.name} · ${formatCents(plan.price_ars)}/mes` : "—" },
          { label: "Vence", value: <span className={due.tone === "bad" ? "text-danger" : due.tone === "warn" ? "text-warning" : ""}>{due.text}</span> },
          { label: "Productos publicados", value: detail.publishedProducts },
          { label: "Pedidos 30 días", value: detail.orders30d },
        ].map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5 bg-surface px-4 py-3">
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted">{item.label}</dt>
            <dd className="font-mono text-[18px] tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <Section title="Datos">
            <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-line bg-surface p-4 text-[14px] sm:grid-cols-2">
              <div><dt className="text-muted">Nombre visible</dt><dd>{settings?.display_name ?? "—"}</dd></div>
              <div><dt className="text-muted">WhatsApp</dt><dd className="font-mono">{settings?.whatsapp_phone ?? "—"}</dd></div>
              <div><dt className="text-muted">Rubro</dt><dd className="capitalize">{tenant.business_type}</dd></div>
              <div><dt className="text-muted">Ciudad</dt><dd>{settings?.city ?? "—"}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Miembros</dt>
                <dd className="flex flex-col">
                  {detail.members.map((m) => (
                    <span key={m.user_id}>
                      {m.email ?? m.user_id} <span className="text-muted">· {m.role === "owner" ? "Dueño" : "Staff"}</span>
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="Pagos">
            {detail.payments.length === 0 ? (
              <p className="rounded-xl border border-line bg-surface px-4 py-3 text-[14px] text-muted">Todavía no hay pagos registrados.</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-[14px]">
                {detail.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                    <span>
                      <span className="font-mono tabular-nums">{formatCents(p.amount)}</span> <span className="text-muted">· {METHOD_LABEL[p.method] ?? p.method}</span>
                      {p.reference ? <span className="font-mono text-[12px] text-muted"> · {p.reference}</span> : null}
                    </span>
                    <span className="text-muted">{formatDate(p.paid_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Auditoría y eventos">
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-[14px]">
              {detail.audit.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                  <span>
                    {ACTION_LABEL[a.action] ?? a.action} <span className="text-muted">· {ACTOR_LABEL[a.actor_kind] ?? a.actor_kind}</span>
                    {a.reason ? <span className="block text-[13px] text-muted">“{a.reason}”</span> : null}
                  </span>
                  <span className="text-muted">{formatDateTime(a.created_at)}</span>
                </li>
              ))}
              {detail.audit.length === 0 ? <li className="px-4 py-3 text-muted">Sin registros.</li> : null}
            </ul>
            <p className="text-[13px] text-muted">
              Últimos eventos: {detail.events.slice(0, 6).map((e) => e.type).join(", ") || "ninguno"}.
            </p>
          </Section>
        </div>

        <div className="flex flex-col gap-6">
          {isSuperadmin ? (
            <>
              <Section title="Registrar pago">
                <div className="rounded-xl border border-line bg-surface p-4">
                  <AdminForm action={recordPaymentAction.bind(null, tenant.id)} submitLabel="Registrar pago">
                    <div className="grid grid-cols-2 gap-3">
                      <label className={field}>
                        Monto
                        <input name="amount" inputMode="decimal" required placeholder={plan ? String(plan.price_ars / 100) : "24.900"} className={`${adminInput} font-mono`} />
                      </label>
                      <label className={field}>
                        Meses
                        <select name="months" defaultValue="1" className={adminInput}>
                          {[1, 2, 3, 6, 12].map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className={field}>
                      Medio
                      <select name="method" defaultValue="mp_link" className={adminInput}>
                        {Object.entries(METHOD_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={field}>
                      Referencia (opcional)
                      <input name="reference" maxLength={200} placeholder="N.º de operación" className={adminInput} />
                    </label>
                    <label className={field}>
                      Nota (opcional)
                      <input name="notes" maxLength={1000} className={adminInput} />
                    </label>
                  </AdminForm>
                </div>
              </Section>

              <Section title="Estado">
                <div className="rounded-xl border border-line bg-surface p-4">
                  <AdminForm action={setStatusAction.bind(null, tenant.id)} submitLabel="Aplicar" tone={tenant.status === "suspended" ? "primary" : "danger"}>
                    <label className={field}>
                      Nuevo estado
                      <select name="status" defaultValue={tenant.status === "suspended" ? "active" : "suspended"} className={adminInput}>
                        <option value="active">Reactivar</option>
                        <option value="suspended">Suspender</option>
                        <option value="cancelled">Cancelar (no se puede deshacer desde acá)</option>
                      </select>
                    </label>
                    <label className={field}>
                      Motivo (queda en la auditoría)
                      <input name="reason" required minLength={3} maxLength={500} className={adminInput} />
                    </label>
                  </AdminForm>
                </div>
              </Section>

              <Section title="Plan y vencimiento">
                <div className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4">
                  <AdminForm action={changePlanAction.bind(null, tenant.id)} submitLabel="Cambiar plan" tone="neutral">
                    <div className="grid grid-cols-2 gap-3">
                      <label className={field}>
                        Plan
                        <select name="plan" defaultValue={subscription?.plan_id ?? "base"} className={adminInput}>
                          <option value="base">Base</option>
                          <option value="pro">Pro</option>
                        </select>
                      </label>
                      <label className={field}>
                        Motivo
                        <input name="reason" required minLength={3} maxLength={500} className={adminInput} />
                      </label>
                    </div>
                  </AdminForm>
                  <AdminForm action={extendPeriodAction.bind(null, tenant.id)} submitLabel="Extender sin cobrar" tone="neutral">
                    <div className="grid grid-cols-2 gap-3">
                      <label className={field}>
                        Días
                        <input name="days" type="number" min={1} max={90} defaultValue={7} required className={`${adminInput} font-mono`} />
                      </label>
                      <label className={field}>
                        Motivo
                        <input name="reason" required minLength={3} maxLength={500} className={adminInput} />
                      </label>
                    </div>
                  </AdminForm>
                </div>
              </Section>
            </>
          ) : (
            <p className="rounded-xl border border-line bg-surface px-4 py-3 text-[14px] text-muted">
              Tu rol es de soporte: podés ver todo, pero los cambios los hace un superadmin.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
