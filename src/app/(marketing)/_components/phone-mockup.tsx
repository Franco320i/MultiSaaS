import { formatCents } from "@/lib/money";
import { SAMPLE_ITEMS, SAMPLE_TOTAL } from "./sample-order";

/** Celular con el catálogo de un comercio ficticio, dibujado con código (sin fotos). */
export function PhoneMockup({ className = "" }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Ejemplo de catálogo de una hamburguesería en el celular"
      className={`w-[min(280px,100%)] rounded-[36px] border border-line bg-black p-2.5 shadow-[0_30px_80px_rgba(124,58,237,0.25)] ${className}`}
    >
      <div aria-hidden="true" className="overflow-hidden rounded-[28px] bg-[var(--mock-screen)] text-[var(--mock-ink)]">
        <div className="h-24 bg-[linear-gradient(135deg,var(--mock-brand),var(--mock-brand-deep))]" />
        <div className="-mt-7 px-4 pb-3">
          <div className="grid size-13 place-items-center rounded-full border-[3px] border-white bg-white font-display text-[22px] text-[var(--mock-brand)]">
            B
          </div>
          <p className="mt-1.5 font-display text-[20px] leading-tight">Burger del Centro</p>
          <p className="text-[12px] font-semibold text-[var(--mock-open)]">● Abierto ahora</p>
        </div>
        <div className="flex gap-3.5 border-b border-[var(--mock-line)] px-4 pt-2 text-[13px]">
          <span className="border-b-2 border-[var(--mock-brand)] pb-1.5 font-semibold">Hamburguesas</span>
          <span className="text-[var(--mock-ink-muted)]">Papas</span>
          <span className="text-[var(--mock-ink-muted)]">Bebidas</span>
        </div>
        <ul>
          {SAMPLE_ITEMS.map((item) => (
            <li key={item.name} className="flex items-center gap-2.5 border-b border-[var(--mock-line)] px-3.5 py-3">
              <span className="size-12 flex-none rounded-xl" style={{ background: item.swatch }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] leading-tight font-semibold">{item.name}</span>
                <span className="text-[12px] text-[var(--mock-ink-muted)] tabular-nums">{formatCents(item.cents)}</span>
              </span>
              <span className="rounded-full bg-[var(--mock-brand)] px-3 py-1.5 text-[12px] font-semibold text-white">Agregar</span>
            </li>
          ))}
        </ul>
        <div className="m-4 flex justify-between rounded-full bg-[var(--mock-brand)] px-4 py-3 text-[14px] font-semibold text-white">
          <span>Ver pedido · 3</span>
          <span className="tabular-nums">{formatCents(SAMPLE_TOTAL)}</span>
        </div>
      </div>
    </div>
  );
}
