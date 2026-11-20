import { Suspense } from "react";
import { getPublicPlans } from "@/core/billing/plans";
import { getDemoCatalogUrl } from "@/core/tenancy/demo";
import { BeforeAfter } from "./_components/before-after";
import { ClosingCta } from "./_components/closing-cta";
import { DemoBand } from "./_components/demo-band";
import { Faq } from "./_components/faq";
import { Features } from "./_components/features";
import { Hero } from "./_components/hero";
import { HowItWorks } from "./_components/how-it-works";
import { Pricing, PricingSkeleton } from "./_components/pricing";

// vidri.ar · Página principal (docs/superpowers/specs/2026-11-20-pagina-principal-design.md).
// Orden pensado para vender: problema → prueba → facilidad → valor → precio sin riesgo → dudas → cierre.
export default function MarketingHome() {
  return (
    <main className="flex flex-col">
      <Suspense fallback={<Hero demoUrl={null} />}>
        <HeroWithDemo />
      </Suspense>
      <BeforeAfter />
      <HowItWorks />
      <Features />
      <Suspense fallback={null}>
        <DemoBandIfPublished />
      </Suspense>
      <Suspense fallback={<PricingSkeleton />}>
        <PricingFromDb />
      </Suspense>
      <Faq />
      <ClosingCta />
    </main>
  );
}

async function HeroWithDemo() {
  return <Hero demoUrl={await getDemoCatalogUrl()} />;
}

async function DemoBandIfPublished() {
  const url = await getDemoCatalogUrl();
  return url ? <DemoBand url={url} /> : null;
}

async function PricingFromDb() {
  return <Pricing plans={await getPublicPlans()} />;
}
