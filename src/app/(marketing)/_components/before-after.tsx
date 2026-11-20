import { SectionHeading } from "./section-heading";
import { WhatsAppBubble } from "./whatsapp-bubble";

type ChatLine = { from: "them" | "me"; text: string } | { from: "photo" };

const CHAOS: ChatLine[] = [
  { from: "them", text: "Hola! ¿precio?" },
  { from: "them", text: "¿tenés en talle M?" },
  { from: "photo" },
  { from: "me", text: "Sí, te paso fotos" },
  { from: "photo" },
  { from: "them", text: "¿hacen envío? ¿hasta qué hora?" },
];

const GAINS = ["Tus productos en un solo lugar", "Un link profesional para compartir", "Los pedidos te llegan escritos"];

export function BeforeAfter() {
  return (
    <section aria-labelledby="antes-despues" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <SectionHeading id="antes-despues" eyebrow="Antes y ahora" title="Menos chats, más pedidos.">
          Contestar “¿precio?” veinte veces por día no es vender. Con tu catálogo, el cliente ve todo y te escribe cuando ya
          sabe qué quiere.
        </SectionHeading>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-surface p-6">
            <p className="text-[14px] font-semibold text-muted">Antes</p>
            <ul className="mt-4 flex flex-col gap-2" aria-label="Chat desordenado de ejemplo">
              {CHAOS.map((line, index) =>
                line.from === "photo" ? (
                  <li key={index} className="h-16 w-28 rounded-xl bg-line">
                    <span className="sr-only">Foto suelta</span>
                  </li>
                ) : (
                  <li
                    key={index}
                    className={`w-fit max-w-[85%] rounded-2xl px-3.5 py-2 text-[14px] ${
                      line.from === "me" ? "self-end bg-surface-muted" : "bg-background"
                    }`}
                  >
                    {line.text}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="flex flex-col rounded-3xl border border-accent/50 bg-surface p-6">
            <p className="text-[14px] font-semibold text-accent-soft">Con Vidri</p>
            <div className="flex flex-1 items-center justify-center py-6">
              <WhatsAppBubble className="w-full max-w-[280px] text-[15px]" />
            </div>
            <p className="text-[14px] text-muted">El cliente eligió solo, desde tu catálogo. Vos confirmás y preparás.</p>
          </div>
        </div>
        <ul className="mt-8 grid gap-3 md:grid-cols-3">
          {GAINS.map((gain) => (
            <li key={gain} className="flex items-center gap-3 text-[16px] font-semibold">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 flex-none text-accent-soft" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {gain}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
