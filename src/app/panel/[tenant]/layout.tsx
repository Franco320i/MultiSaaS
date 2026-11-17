import Link from "next/link";
import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";

// Menú del comercio. El acceso lo verifica cada página (y cada acción) con
// requireTenantAccess: el layout solo dibuja la navegación.
export default function TenantLayout({ children, params }: LayoutProps<"/panel/[tenant]">) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<nav className="h-11 border-b border-foreground/10" />}>
        <TenantNav params={params} />
      </Suspense>
      {children}
    </div>
  );
}

async function TenantNav({ params }: Pick<LayoutProps<"/panel/[tenant]">, "params">) {
  const { tenant } = await params;
  // El menú muestra solo lo que el rol puede usar (cada página igual lo verifica).
  const access = await requireTenantAccess(tenant, "panel.view");
  const links = [
    { href: `/${tenant}`, label: "Inicio" },
    { href: `/${tenant}/pedidos`, label: "Pedidos" },
    { href: `/${tenant}/productos`, label: "Productos" },
    { href: `/${tenant}/categorias`, label: "Categorías" },
    ...(access.role === "owner" ? [{ href: `/${tenant}/ajustes`, label: "Ajustes" }] : []),
  ];

  return (
    <nav className="flex gap-4 border-b border-foreground/10 px-6 py-3 text-sm">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="hover:underline">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
