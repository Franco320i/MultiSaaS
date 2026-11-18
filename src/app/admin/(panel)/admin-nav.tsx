"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Resumen" },
  { href: "/comercios", label: "Comercios" },
  { href: "/alta", label: "Alta asistida" },
  { href: "/auditoria", label: "Auditoría" },
];

/** Menú del panel central. En el celular, en fila con desplazamiento horizontal. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel central" className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" || pathname === "/admin" : pathname.includes(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors ${
              active ? "bg-surface-muted text-foreground" : "text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
