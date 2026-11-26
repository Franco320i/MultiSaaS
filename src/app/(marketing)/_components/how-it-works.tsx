import { SectionHeading } from "./section-heading";

const STEPS = [
  { title: "Nos escribís por WhatsApp", text: "Tocás «Pedí tu demo» y nos contás qué vendés." },
  { title: "Te armamos el catálogo", text: "Con tu logo, tus colores, tus productos y tus horarios. Después cambiás precios y stock vos." },
  { title: "Compartís el link y el QR", text: "En tu Instagram, en tus estados y en el mostrador. Los pedidos empiezan a llegar." },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <SectionHeading id="como-funciona-titulo" eyebrow="Cómo funciona" title="Listo en tres pasos.">
          No necesitás saber de tecnología: el catálogo te lo dejamos listo.
        </SectionHeading>
        <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative flex gap-5 md:flex-col md:items-center md:text-center">
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-12 bottom-[-2rem] left-5 w-px bg-line md:top-5 md:right-[-50%] md:bottom-auto md:left-[calc(50%+2rem)] md:h-px md:w-auto"
                />
              ) : null}
              <span className="relative grid size-10 flex-none place-items-center rounded-full border border-accent-soft/50 bg-background font-display text-[16px] text-accent-soft tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[19px] font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-[16px] text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
