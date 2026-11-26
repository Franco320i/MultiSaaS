import Link from "next/link";
import type { SetupStatus } from "../queries";

/**
 * Lo que le falta al comercio (diseño, sección 10, paso 8: logo, horarios y 5 productos
 * con foto). Cada pendiente lleva a donde se resuelve: en el asistente, a su paso; en Mi local
 * (`inSettings`), a su sección. Lo hecho se marca con texto.
 */
export function SetupChecklist({
  slug,
  status,
  title,
  inSettings = false,
}: {
  slug: string;
  status: SetupStatus;
  title?: string;
  inSettings?: boolean;
}) {
  const where = (step: string, section: string) =>
    inSettings ? `/${slug}/ajustes?seccion=${section}` : `/${slug}/configurar?paso=${step}`;
  const items = [
    { done: status.hasWhatsapp, label: "WhatsApp para recibir pedidos", href: where("contacto", "contacto") },
    { done: status.hasLogo, label: "Logo del comercio", href: where("marca", "marca") },
    { done: status.hasHours, label: "Horarios de atención", href: where("horarios", "horarios") },
    { done: status.publishedProducts >= 1, label: "Al menos un producto publicado", href: `/${slug}/productos/nuevo` },
    {
      done: status.productsWithPhoto >= 5,
      label: `5 productos con foto (${Math.min(status.productsWithPhoto, 5)} de 5)`,
      href: `/${slug}/productos`,
    },
    { done: status.publishedAt !== null, label: "Catálogo publicado", href: where("publicar", "link") },
  ];
  const pending = items.filter((i) => !i.done).length;
  if (pending === 0) return null;

  return (
    <section aria-labelledby="pendientes" className="flex flex-col gap-3 rounded-2xl bg-surface p-5">
      <h2 id="pendientes" className="font-display text-[22px] leading-tight">
        {title ??
          (pending === 1
            ? "Te falta 1 cosa para tener tu catálogo completo"
            : `Te faltan ${pending} cosas para tener tu catálogo completo`)}
      </h2>
      <ul className="flex flex-col divide-y divide-line">
        {items.map((item) => (
          <li key={item.label} className="flex min-h-12 items-center justify-between gap-3 py-2">
            <span className={item.done ? "text-muted line-through" : "font-semibold"}>
              <span className="sr-only">{item.done ? "Hecho: " : "Pendiente: "}</span>
              {item.label}
            </span>
            {item.done ? (
              <span className="text-[14px] font-semibold text-accent">Listo</span>
            ) : (
              <Link href={item.href} className="min-h-11 shrink-0 py-2.5 text-[15px] font-semibold underline underline-offset-4">
                Completar
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
