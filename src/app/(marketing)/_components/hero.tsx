import { ButtonLink } from "./button-link";
import { Glow } from "./glow";
import { PhoneMockup } from "./phone-mockup";
import { WhatsAppBubble } from "./whatsapp-bubble";

export const RISK_LINE = "14 días gratis · Sin tarjeta · Sin comisiones por venta";

export function Hero({ demoUrl }: { demoUrl: string | null }) {
  return (
    <section className="relative isolate">
      <Glow className="top-0 right-[-30%] h-[520px] w-[720px] md:right-0" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:pt-24 md:pb-24">
        <div className="mk-rise">
          <p className="inline-block rounded-full border border-line px-3 py-1 text-[13px] tracking-[0.06em] text-accent-soft uppercase">
            Catálogos con pedidos a WhatsApp
          </p>
          <h1 className="mt-5 font-display text-[38px] leading-[1.08] text-balance md:text-[56px]">
            Dejá de mandar fotos y precios por WhatsApp.{" "}
            <span className="text-accent-soft">Tu catálogo, con tu marca, en un link.</span>
          </h1>
          <p className="mt-5 max-w-[34rem] text-[18px] text-muted">
            Tus clientes eligen, arman el pedido y te llega al WhatsApp ya escrito. Vos lo manejás todo desde el celular.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/registro">Crear mi catálogo gratis</ButtonLink>
            {demoUrl ? (
              <ButtonLink href={demoUrl} variant="ghost">
                Mirá un catálogo de ejemplo
              </ButtonLink>
            ) : null}
          </div>
          <p className="mt-4 text-[14px] text-muted">{RISK_LINE}</p>
        </div>
        <div className="relative flex flex-col items-center md:block md:justify-self-center">
          <PhoneMockup className="mk-rise" />
          <WhatsAppBubble className="mk-rise-late -mt-10 self-end md:absolute md:right-[-56px] md:bottom-10 md:mt-0" />
        </div>
      </div>
    </section>
  );
}
