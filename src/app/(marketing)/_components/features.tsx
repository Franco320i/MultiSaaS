import type { ReactNode } from "react";
import { formatCents } from "@/lib/money";
import { SectionHeading } from "./section-heading";
import { WhatsAppBubble } from "./whatsapp-bubble";

/** Bloque de función: título, texto y una mini maqueta dibujada con código. */
function Feature({
  title,
  text,
  children,
  className = "",
}: {
  title: string;
  text: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <li className={`flex flex-col gap-5 rounded-3xl border border-line bg-surface p-6 ${className}`}>
      {children ? (
        <div aria-hidden="true" className="flex min-h-28 items-center justify-center rounded-2xl bg-background p-4">
          {children}
        </div>
      ) : null}
      <div>
        <h3 className="text-[19px] font-semibold">{title}</h3>
        <p className="mt-1.5 text-[16px] text-muted">{text}</p>
      </div>
    </li>
  );
}

const ORDER_STATES = [
  { label: "Nuevo", tone: "bg-accent text-accent-foreground" },
  { label: "Confirmado", tone: "bg-surface-muted text-foreground" },
  { label: "En preparación", tone: "bg-surface-muted text-foreground" },
  { label: "Listo", tone: "bg-surface-muted text-foreground" },
  { label: "Entregado", tone: "border border-line text-muted" },
  { label: "Cancelado", tone: "border border-line text-muted" },
];

/** Mini catálogo: categorías arriba y una grilla de productos con un destacado. */
function CatalogSketch() {
  return (
    <div className="w-full max-w-[320px] rounded-2xl bg-[var(--mock-screen)] p-3 text-[var(--mock-ink)]">
      <div className="flex gap-2 text-[11px] font-semibold">
        <span className="rounded-full bg-[var(--mock-brand)] px-2.5 py-1 text-white">Destacados</span>
        <span className="rounded-full border border-[var(--mock-line)] px-2.5 py-1">Pizzas</span>
        <span className="rounded-full border border-[var(--mock-line)] px-2.5 py-1">Postres</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {["linear-gradient(135deg,#F59E0B,#B45309)", "linear-gradient(135deg,#FCA5A5,#B91C1C)", "linear-gradient(135deg,#FDE68A,#D97706)"].map(
          (swatch, index) => (
            <div key={swatch}>
              <div className="relative aspect-square rounded-lg" style={{ background: swatch }}>
                {index === 0 ? (
                  <span className="absolute top-1 left-1 rounded-full bg-white px-1.5 text-[9px] font-semibold">★</span>
                ) : null}
              </div>
              <div className="mt-1.5 h-1.5 w-4/5 rounded bg-[var(--mock-line)]" />
              <div className="mt-1 h-1.5 w-2/5 rounded bg-[var(--mock-line)]" />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section id="funciones" aria-labelledby="funciones-titulo" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <SectionHeading id="funciones-titulo" eyebrow="Funciones" title="Todo lo que necesitás para vender por WhatsApp.">
          Pensado para comercios que atienden desde el celular, entre cliente y cliente.
        </SectionHeading>
        <ul className="mt-10 grid gap-4 md:grid-cols-6">
          <Feature
            className="md:col-span-3"
            title="Tu catálogo, con fotos y categorías"
            text="Ordená tus productos por categoría y destacá los que más vendés. Tus clientes lo abren desde un link, sin descargar nada."
          >
            <CatalogSketch />
          </Feature>
          <Feature
            className="md:col-span-3"
            title="El pedido te llega a WhatsApp ya escrito"
            text="Con los productos, las cantidades, el total y si es envío o retiro. Sin ida y vuelta para entender qué quiere el cliente."
          >
            <WhatsAppBubble className="shadow-none" />
          </Feature>
          <Feature
            className="md:col-span-2"
            title="Panel de pedidos"
            text="Seguí cada pedido por estado y enterate cuando entra uno nuevo."
          >
            <ul className="flex flex-wrap justify-center gap-1.5 text-[12px] font-semibold">
              {ORDER_STATES.map((state) => (
                <li key={state.label} className={`rounded-full px-2.5 py-1 ${state.tone}`}>
                  {state.label}
                </li>
              ))}
            </ul>
          </Feature>
          <Feature className="md:col-span-2" title="Con tu marca" text="Tu logo, tu portada y tu color. El catálogo es tuyo, no nuestro.">
            <div className="flex items-center gap-3">
              {["#C2410C", "#0F766E", "#7C2D12", "#1D4ED8"].map((color) => (
                <span key={color} className="size-9 rounded-full border-2 border-background ring-1 ring-line" style={{ background: color }} />
              ))}
            </div>
          </Feature>
          <Feature
            className="md:col-span-2"
            title="Horarios, envío y retiro"
            text="Muestra “Abierto ahora” según tus horarios. Elegís envío, retiro o los dos, con costo de envío y pedido mínimo."
          >
            <div className="flex flex-col items-center gap-2 text-[13px]">
              <span className="rounded-full bg-[color-mix(in_srgb,var(--mock-whatsapp)_18%,transparent)] px-3 py-1 font-semibold text-[var(--mock-whatsapp)]">
                ● Abierto ahora
              </span>
              <span className="text-muted">Envío {formatCents(150000)} · Mínimo {formatCents(800000)}</span>
            </div>
          </Feature>
          <Feature
            className="md:col-span-2"
            title="Ofertas y sin stock"
            text="Mostrá el precio anterior tachado y marcá “Sin stock” lo que se terminó, con un toque."
          >
            <div className="flex items-center gap-3 text-[14px]">
              <span className="text-muted line-through tabular-nums">{formatCents(1200000)}</span>
              <span className="font-semibold tabular-nums">{formatCents(990000)}</span>
              <span className="rounded-full border border-line px-2.5 py-1 text-[12px] text-muted">Sin stock</span>
            </div>
          </Feature>
          <Feature
            className="md:col-span-2"
            title="Cargá todo de una vez"
            text="¿Tenés tu lista de precios en una planilla? Copiás, pegás y tus productos quedan cargados."
          >
            <div className="grid w-full max-w-[200px] grid-cols-[2fr_1fr] gap-px overflow-hidden rounded-lg border border-line bg-line text-[11px]">
              {["Producto", "Precio", "Muzzarella", "9.800", "Fugazzeta", "11.200"].map((cell, index) => (
                <span key={index} className={`bg-surface px-2 py-1 ${index < 2 ? "font-semibold" : "text-muted tabular-nums"}`}>
                  {cell}
                </span>
              ))}
            </div>
          </Feature>
          <Feature
            className="md:col-span-2"
            title="QR y link para compartir"
            text="Imprimí el QR para el mostrador y poné el link en tu Instagram y en tus estados."
          >
            <svg viewBox="0 0 7 7" className="size-20 text-foreground" shapeRendering="crispEdges">
              <path
                fill="currentColor"
                d="M0 0h3v3H0zM4 0h3v3H4zM0 4h3v3H0zM1 1v1h1V1zM5 1v1h1V1zM1 5v1h1V5zM4 4h1v1H4zM6 4h1v1H6zM5 5h1v1H5zM4 6h1v1H4zM6 6h1v1H6z"
                fillRule="evenodd"
              />
            </svg>
          </Feature>
        </ul>
        <p className="mt-10 rounded-3xl border border-accent/50 bg-surface px-6 py-8 text-center font-display text-[24px] leading-snug text-balance md:text-[30px]">
          Sin comisiones por venta. <span className="text-accent-soft">Pagás el abono y listo.</span>
        </p>
      </div>
    </section>
  );
}
