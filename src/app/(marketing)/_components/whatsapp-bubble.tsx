import { formatCents } from "@/lib/money";
import { SAMPLE_ITEMS, SAMPLE_TOTAL } from "./sample-order";

/** El pedido tal como le llega al comercio por WhatsApp, ya escrito. */
export function WhatsAppBubble({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-[min(240px,100%)] rounded-2xl border border-line bg-surface-muted px-4 py-3 text-[13px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${className}`}
    >
      <p className="mb-1.5 flex items-center gap-2 font-semibold">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-[var(--mock-whatsapp)]" />
        Nuevo pedido #128
      </p>
      <ul className="text-muted">
        {SAMPLE_ITEMS.map((item) => (
          <li key={item.name}>1 x {item.name}</li>
        ))}
      </ul>
      <p className="mt-1 text-muted tabular-nums">Total: {formatCents(SAMPLE_TOTAL)} · Retiro</p>
    </div>
  );
}
