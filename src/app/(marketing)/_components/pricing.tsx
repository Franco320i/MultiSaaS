import type { ReactNode } from "react";
import { planHighlights, recommendedPlanId, TRIAL_DAYS, type PublicPlan } from "@/core/billing/plan-display";
import { formatCents } from "@/lib/money";
import { ButtonLink } from "./button-link";
import { SectionHeading } from "./section-heading";

/** Lo que incluyen todos los planes (funciones que existen hoy). */
const COMMON = ["Pedidos a WhatsApp sin comisión", "Panel de pedidos", "Tu marca y tus colores", "QR y link para compartir"];

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 size-5 flex-none text-accent-soft" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PricingShell({ children }: { children: ReactNode }) {
  return (
    <section id="planes" aria-labelledby="planes-titulo" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <SectionHeading id="planes-titulo" eyebrow="Planes" title="Un precio fijo por mes. Sin comisiones.">
          Empezá gratis {TRIAL_DAYS} días, sin cargar tarjeta. Elegí un plan recién cuando veas que te sirve.
        </SectionHeading>
        {children}
        <p className="mt-6 text-[14px] text-muted">Precios finales en pesos argentinos. Se paga mes a mes, sin permanencia.</p>
      </div>
    </section>
  );
}

/** Tarjetas de planes leídas de la tabla `plans`. Sin planes (base caída), un texto en su lugar. */
export function Pricing({ plans }: { plans: PublicPlan[] }) {
  const recommended = recommendedPlanId(plans);

  if (plans.length === 0) {
    return (
      <PricingShell>
        <div className="mt-10 rounded-3xl border border-line bg-surface p-8">
          <p className="text-[17px]">
            Estamos actualizando los precios. Creá tu cuenta y probá {TRIAL_DAYS} días gratis.
          </p>
          <ButtonLink href="/registro" className="mt-5">
            Empezar gratis
          </ButtonLink>
        </div>
      </PricingShell>
    );
  }

  return (
    <PricingShell>
      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:mx-auto lg:max-w-4xl">
        {plans.map((plan) => {
          const isRecommended = plan.id === recommended;
          return (
            <li
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border bg-surface p-7 ${
                isRecommended ? "border-accent shadow-[0_20px_60px_-20px_rgba(124,58,237,0.6)]" : "border-line"
              }`}
            >
              {isRecommended ? (
                <p className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-0.5 text-[13px] font-semibold text-accent-foreground">
                  Recomendado
                </p>
              ) : null}
              <h3 className="font-display text-[26px]">{plan.name}</h3>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[40px] leading-none font-semibold tabular-nums">{formatCents(plan.priceCents)}</span>
                <span className="text-muted">/mes</span>
              </p>
              <p className="mt-2 text-[15px] text-accent-soft">{TRIAL_DAYS} días gratis, sin tarjeta</p>
              <ul className="mt-6 flex flex-col gap-2.5 border-t border-line pt-6 text-[16px]">
                {[...planHighlights(plan), ...COMMON].map((line, index) => (
                  <li key={line} className={`flex gap-2.5 ${index < 2 ? "font-semibold" : ""}`}>
                    <Check />
                    {line}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/registro" variant={isRecommended ? "primary" : "ghost"} className="mt-8 w-full">
                Empezar gratis
              </ButtonLink>
            </li>
          );
        })}
      </ul>
    </PricingShell>
  );
}

/** Esqueleto mientras se leen los planes. */
export function PricingSkeleton() {
  return (
    <PricingShell>
      <div aria-hidden="true" className="mt-10 grid gap-4 md:grid-cols-2 lg:mx-auto lg:max-w-4xl">
        {[0, 1].map((key) => (
          <div key={key} className="h-[480px] animate-pulse rounded-3xl border border-line bg-surface motion-reduce:animate-none" />
        ))}
      </div>
    </PricingShell>
  );
}
