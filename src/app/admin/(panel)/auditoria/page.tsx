import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { requirePlatformAdmin } from "@/core/admin/access";
import { listAudit } from "@/core/admin/service";
import { ACTION_LABEL, ACTOR_LABEL, formatDateTime, PageHeader } from "@/app/admin/(panel)/ui";

export const metadata: Metadata = { title: "Auditoría" };

const PAGE_SIZE = 50;
const ACTORS = ["platform_admin", "owner", "staff", "system"] as const;

// admin.tuapp.com.ar/auditoria · Quién hizo qué, filtrable por comercio y por actor.
export default function AuditPage({ searchParams }: PageProps<"/admin/auditoria">) {
  return (
    <main className="flex flex-col gap-5 px-4 py-6 md:px-8">
      <Suspense fallback={<div aria-busy="true" className="h-96 rounded-xl bg-surface" />}>
        <Audit searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Audit({ searchParams }: Pick<PageProps<"/admin/auditoria">, "searchParams">) {
  await requirePlatformAdmin("/auditoria");
  const params = await searchParams;
  const tenantId = z.uuid().safeParse(params.comercio).success ? (params.comercio as string) : undefined;
  const actorKind = (ACTORS as readonly string[]).includes(params.actor as string) ? (params.actor as string) : undefined;
  const page = Math.max(1, Math.min(1000, Number(params.pagina) || 1));
  const { rows, total } = await listAudit({ tenantId, actorKind, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (changes: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = { comercio: tenantId, actor: actorKind, pagina: page > 1 ? page : undefined, ...changes };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined) next.set(k, String(v));
    const s = next.toString();
    return s ? `/auditoria?${s}` : "/auditoria";
  };

  return (
    <>
      <PageHeader title="Auditoría" subtitle={`${total} registros${tenantId ? " de este comercio" : ""}`} />
      <nav aria-label="Filtrar por actor" className="flex flex-wrap gap-2">
        {[undefined, ...ACTORS].map((actor) => (
          <Link
            key={actor ?? "todos"}
            href={href({ actor, pagina: undefined })}
            aria-current={actor === actorKind ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors ${
              actor === actorKind ? "border-accent bg-surface-muted text-foreground" : "border-line text-muted hover:text-foreground"
            }`}
          >
            {actor ? ACTOR_LABEL[actor] : "Todos"}
          </Link>
        ))}
        {tenantId ? (
          <Link href={href({ comercio: undefined, pagina: undefined })} className="rounded-full border border-line px-3 py-1 text-[13px] font-semibold text-muted hover:text-foreground">
            Quitar filtro de comercio ×
          </Link>
        ) : null}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-muted">No hay registros con estos filtros.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-[14px]">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5">
              <span className="min-w-0">
                <span className="font-semibold">{ACTION_LABEL[r.action] ?? r.action}</span>
                {r.tenantId ? (
                  <>
                    {" · "}
                    <Link href={`/comercios/${r.tenantId}`} className="hover:underline">
                      {r.tenantName ?? "comercio borrado"}
                    </Link>
                  </>
                ) : null}
                <span className="text-muted"> · {ACTOR_LABEL[r.actorKind] ?? r.actorKind}</span>
                {r.reason ? <span className="block text-[13px] text-muted">“{r.reason}”</span> : null}
              </span>
              <span className="font-mono text-[12px] text-muted">{formatDateTime(r.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Páginas" className="flex items-center justify-between text-[14px]">
          {page > 1 ? <Link href={href({ pagina: page - 1 })} className="admin-btn rounded-[10px] border border-line px-3 py-1.5">← Anterior</Link> : <span />}
          <span className="font-mono text-muted">{page} / {pages}</span>
          {page < pages ? <Link href={href({ pagina: page + 1 })} className="admin-btn rounded-[10px] border border-line px-3 py-1.5">Siguiente →</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
