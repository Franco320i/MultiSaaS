import { ButtonLink } from "./button-link";
import { Glow } from "./glow";
import { RISK_LINE } from "./hero";

export function ClosingCta({ demoRequest }: { demoRequest: string | null }) {
  return (
    <section aria-labelledby="cierre-titulo" className="relative isolate overflow-hidden border-t border-line">
      <Glow className="top-1/2 left-1/2 h-[480px] w-[760px] -translate-x-1/2 -translate-y-1/2" />
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center md:px-6">
        <h2 id="cierre-titulo" className="font-display text-[34px] leading-tight text-balance md:text-[48px]">
          Empezá a vender de una manera más profesional.
        </h2>
        <p className="mt-4 text-[18px] text-muted">Contanos qué vendés y te armamos el catálogo con tu marca y tus productos.</p>
        {demoRequest ? (
          <ButtonLink href={demoRequest} className="mt-8">
            Pedí tu demo
          </ButtonLink>
        ) : null}
        <p className="mt-4 text-[14px] text-muted">{RISK_LINE}</p>
      </div>
    </section>
  );
}
