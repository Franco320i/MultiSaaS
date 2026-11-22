import { describeOrderStats, type OrderStats } from "../stats";

/**
 * Tarjeta de resultados del inicio del panel: lo que el comercio vendió este mes con Vidri.
 * `catalogUrl` solo si el catálogo está publicado (para el estado vacío).
 */
export function OrderStatsCard({
  stats,
  currency,
  catalogUrl,
}: {
  stats: OrderStats;
  currency?: string;
  catalogUrl: string | null;
}) {
  const text = describeOrderStats(stats, currency);

  return (
    <section aria-labelledby="resultados" className="flex flex-col gap-2 rounded-2xl bg-surface p-5">
      <h2 id="resultados" className="text-[13px] font-semibold tracking-wide text-muted uppercase">
        {text.monthLabel}
      </h2>
      {text.empty ? (
        <>
          <p className="text-[17px]">{text.emptyText}</p>
          {catalogUrl ? (
            <a
              href={catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit py-2 font-semibold break-all underline underline-offset-4"
            >
              {catalogUrl.replace(/^https?:\/\//, "")}
            </a>
          ) : null}
        </>
      ) : (
        <>
          <p className="font-display text-[30px] leading-tight tabular-nums text-balance">
            {text.ordersLabel} · {text.amountLabel}
          </p>
          {text.change || text.top ? (
            <p className="flex flex-wrap gap-x-2 text-[15px] text-muted">
              {text.change ? (
                <span className={text.change.direction === "up" ? "font-semibold text-accent" : undefined}>
                  {text.change.text}
                </span>
              ) : null}
              {text.change && text.top ? <span aria-hidden>·</span> : null}
              {text.top ? <span>{text.top}</span> : null}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
