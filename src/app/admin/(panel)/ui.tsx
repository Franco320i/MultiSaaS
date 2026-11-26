import type { ReactNode } from "react";

/**
 * Piezas visuales del panel central (Grafito, docs/design/sistema-visual.md).
 * El estado se lee siempre como texto; el color solo lo refuerza.
 */

const STATUS: Record<string, { label: string; tone: "ok" | "neutral" | "warn" | "bad" }> = {
  active: { label: "Activo", tone: "ok" },
  trial: { label: "Prueba", tone: "neutral" },
  past_due: { label: "Pago pendiente", tone: "warn" },
  suspended: { label: "Suspendido", tone: "bad" },
  cancelled: { label: "Cancelado", tone: "bad" },
};

const TONE = {
  ok: "text-accent bg-accent/15",
  neutral: "text-foreground bg-surface-muted",
  warn: "text-warning bg-warning/15",
  bad: "text-danger bg-danger/15",
};

export function TenantStatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${TONE[s.tone]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-[14px] text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function KpiStrip({ items }: { items: { label: string; value: ReactNode; hint?: ReactNode; tone?: "warn" | "bad" }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5 bg-surface px-4 py-3.5">
          <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted">{item.label}</dt>
          <dd className="font-mono text-[26px] leading-tight tabular-nums">{item.value}</dd>
          {item.hint ? (
            <dd className={`text-[13px] ${item.tone === "warn" ? "text-warning" : item.tone === "bad" ? "text-danger" : "text-muted"}`}>{item.hint}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

const dateFormat = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
const dateTimeFormat = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Argentina/Buenos_Aires",
});

export const formatDate = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : "—");
export const formatDateTime = (iso: string | null) => (iso ? dateTimeFormat.format(new Date(iso)) : "—");

/** "en 3 días", "hoy", "venció hace 4 días": con tono para pintar lo urgente. */
export function dueLabel(iso: string | null, now: Date): { text: string; tone: "" | "warn" | "bad" } {
  if (!iso) return { text: "—", tone: "" };
  const days = Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return { text: `venció hace ${-days} ${days === -1 ? "día" : "días"}`, tone: "bad" };
  if (days === 0) return { text: "vence hoy", tone: "bad" };
  if (days <= 7) return { text: `en ${days} ${days === 1 ? "día" : "días"}`, tone: "warn" };
  return { text: formatDate(iso), tone: "" };
}

export const ACTION_LABEL: Record<string, string> = {
  "tenant.created": "Alta del comercio",
  "tenant.published": "Publicó el catálogo",
  "tenant.unpublished": "Despublicó el catálogo",
  "tenant.suspended": "Suspensión",
  "tenant.reactivated": "Reactivación",
  "tenant.cancelled": "Cancelación",
  "tenant.past_due": "Pasó a pago pendiente",
  "subscription.paid": "Pago registrado",
  "subscription.plan_changed": "Cambio de plan",
  "subscription.extended": "Vencimiento extendido",
  "support.viewed": "Entró soporte",
  "owner.password_reset": "Nueva contraseña del dueño",
};

export const ACTOR_LABEL: Record<string, string> = {
  platform_admin: "Panel central",
  owner: "Dueño",
  staff: "Staff",
  system: "Automático",
};
