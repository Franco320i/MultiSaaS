"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Menú del panel del comercio (docs/superpowers/specs/2026-11-23-panel-facil-design.md).
 * Celular: barra fija abajo con íconos, como WhatsApp. Desde 768 px: la misma fila arriba.
 * Marca la sección actual y muestra los pedidos nuevos sin atender.
 */
export type NavKey = "inicio" | "pedidos" | "productos" | "local";

const ICONS: Record<NavKey, React.ReactNode> = {
  inicio: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" />,
  pedidos: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  productos: (
    <>
      <path d="M4 7l8-4 8 4v10l-8 4-8-4z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </>
  ),
  local: (
    <>
      <path d="M4 10h16l-1.5-5h-13z" />
      <path d="M5 10v10h14V10M10 20v-5h4v5" />
    </>
  ),
};

export function TenantNav({
  slug,
  items,
  newOrders,
}: {
  slug: string;
  items: { key: NavKey; label: string; href: string }[];
  newOrders: number;
}) {
  const pathname = usePathname();
  // En el panel la ruta interna es /panel/{slug}/...; en el navegador se ve /{slug}/...
  const rest = pathname.replace(/^\/panel/, "").replace(new RegExp(`^/${slug}`), "") || "/";
  const current: NavKey = rest.startsWith("/pedidos")
    ? "pedidos"
    : rest.startsWith("/productos") || rest.startsWith("/categorias")
      ? "productos"
      : rest.startsWith("/ajustes") || rest.startsWith("/configurar")
        ? "local"
        : "inicio";

  return (
    <nav
      aria-label="Menú del panel"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:static md:border-t-0 md:border-b md:bg-background md:pb-0"
    >
      <ul
        className="mx-auto grid max-w-3xl md:flex md:gap-2 md:px-6"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = item.key === current;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[12px] md:min-h-12 md:flex-row md:gap-2 md:px-3 md:text-[15px] ${
                  active ? "font-bold text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.4 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="size-6 md:size-5"
                >
                  {ICONS[item.key]}
                </svg>
                {item.label}
                {item.key === "pedidos" && newOrders > 0 ? (
                  <span className="absolute top-1.5 left-1/2 ml-2 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-background md:static md:ml-0">
                    {newOrders}
                    <span className="sr-only"> pedidos nuevos</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
