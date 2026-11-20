import { SectionHeading } from "./section-heading";

/** Respuestas solo con lo que la app hace hoy: cobro mensual y manual, sin permanencia. */
const QUESTIONS = [
  {
    q: "¿Necesito saber de tecnología?",
    a: "No. Si sabés usar WhatsApp, sabés usar Vidri. Cargás productos desde el celular o los pegás desde una planilla.",
  },
  {
    q: "¿Funciona en el celular?",
    a: "Sí. Tus clientes compran desde el celular y vos manejás todo desde el tuyo.",
  },
  {
    q: "¿Cómo me llegan los pedidos?",
    a: "Tu cliente arma el pedido en tu catálogo y se abre WhatsApp con el mensaje ya escrito para vos. Además queda guardado en tu panel.",
  },
  {
    q: "¿Cobran comisión por venta?",
    a: "No. Pagás el abono mensual y nada más, vendas lo que vendas.",
  },
  {
    q: "¿Puedo cambiar precios cuando quiera?",
    a: "Sí, cuando quieras. El cambio se ve en tu catálogo enseguida.",
  },
  {
    q: "¿Qué pasa cuando terminan los 14 días?",
    a: "Si elegís un plan y lo pagás, seguís igual. Si no, tu catálogo se pausa y tus datos quedan guardados.",
  },
  {
    q: "¿Cómo doy de baja?",
    a: "Dejás de pagar y listo: no hay permanencia ni penalidades. Tu catálogo se pausa.",
  },
];

export function Faq() {
  return (
    <section id="preguntas" aria-labelledby="preguntas-titulo" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1fr_1.4fr] md:px-6">
        <SectionHeading id="preguntas-titulo" eyebrow="Preguntas frecuentes" title="Lo que todos preguntan antes de empezar." />
        <div className="flex flex-col">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="group border-b border-line">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="size-5 flex-none text-accent-soft transition-transform group-open:rotate-45 motion-reduce:transition-none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M10 4v12M4 10h12" />
                </svg>
              </summary>
              <p className="pb-5 text-[16px] text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
