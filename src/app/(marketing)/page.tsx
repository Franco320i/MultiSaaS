import { Suspense } from "react";
import { getDemoCatalogUrl } from "@/core/tenancy/demo";
import { BeforeAfter } from "./_components/before-after";
import { Hero } from "./_components/hero";
import { HowItWorks } from "./_components/how-it-works";

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
      <section id="funciones" />
      <section id="planes" />
      <section id="preguntas" />
    </main>
  );
}

async function HeroWithDemo() {
  return <Hero demoUrl={await getDemoCatalogUrl()} />;
}
