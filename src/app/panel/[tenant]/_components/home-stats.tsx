import Link from "next/link";
import type { ReactNode } from "react";
import { formatCents } from "@/lib/money";
import { statValueSize, type StatValueSize } from "./stat-value";

const VALUE_SIZE: Record<StatValueSize, string> = {
  large: "text-[24px] leading-tight",
  medium: "text-[19px] leading-tight",
  small: "text-[17px] leading-snug",
};

/**
 * Los 4 números del Inicio (estilo PPW): grilla de 2 × 2 con divisorias de 1 px. Cada celda
 * es un atajo a su sección. Los datos llegan armados desde la ruta (pedidos y catálogo son
 * módulos distintos).
 */
export function HomeStats({
  slug,
  monthOrders,
  change,
  monthTotal,
  productsTotal,
  outOfStock,
  topProduct,
}: {
  slug: string;
  monthOrders: number;
  change: { direction: "up" | "down" | "same"; text: string } | null;
  monthTotal: number;
  productsTotal: number;
  outOfStock: number;
  topProduct: { name: string; units: number } | null;
}) {
  return (
    <section aria-label="Cómo va el mes" className="grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-line bg-line">
      <Stat href={`/${slug}/pedidos`} label="Pedidos del mes" value={String(monthOrders)}>
        Por WhatsApp
      </Stat>
      {/* La comparación es de plata (ventas contra el mismo período del mes anterior). */}
      <Stat href={`/${slug}/pedidos?ver=terminados`} label="Ventas del mes" value={formatCents(monthTotal)}>
        {change ? (
          <span className={change.direction === "up" ? "font-semibold text-accent" : undefined}>{change.text}</span>
        ) : (
          "Sin contar cancelados"
        )}
      </Stat>
      <Stat href={`/${slug}/productos`} label="Productos" value={String(productsTotal)}>
        {outOfStock > 0 ? (
          <span className="font-semibold text-warning">{outOfStock === 1 ? "1 sin stock" : `${outOfStock} sin stock`}</span>
        ) : (
          "Todos con stock"
        )}
      </Stat>
      <Stat href={`/${slug}/productos`} label="El más pedido" value={topProduct?.name ?? "Todavía no hay"} kind="text">
        {topProduct ? (topProduct.units === 1 ? "1 vez este mes" : `${topProduct.units} veces este mes`) : "Aparece con el primer pedido"}
      </Stat>
    </section>
  );
}

function Stat({
  href,
  label,
  value,
  kind = "number",
  children,
}: {
  href: string;
  label: string;
  value: string;
  kind?: "number" | "text";
  children: ReactNode;
}) {
  const size = statValueSize(value, kind);
  return (
    <Link
      href={href}
      className="relative flex min-h-24 min-w-0 flex-col gap-0.5 bg-surface p-3 hover:bg-surface-muted/50 focus-visible:outline-offset-[-4px]"
    >
      <span aria-hidden className="absolute top-2.5 right-3 text-[13px] text-muted">
        ↗
      </span>
      <span className="pr-4 text-[12px] text-muted">{label}</span>
      <span className={`font-display tabular-nums ${VALUE_SIZE[size]}`}>{value}</span>
      <span className="text-[12px] leading-snug text-muted">{children}</span>
    </Link>
  );
}
