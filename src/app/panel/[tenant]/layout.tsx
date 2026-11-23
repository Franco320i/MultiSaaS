import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy/require-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countNewOrders } from "@/modules/orders";
import { TenantNav, type NavKey } from "./_components/tenant-nav";

// Menú del comercio. El acceso lo verifica cada página (y cada acción) con
// requireTenantAccess: el layout solo dibuja la navegación.
// En el celular el menú va fijo abajo: el contenido deja lugar con pb-24.
export default function TenantLayout({ children, params }: LayoutProps<"/panel/[tenant]">) {
  return (
    <div className="flex flex-1 flex-col pb-24 md:pb-0">
      <Suspense fallback={<div className="hidden h-12 border-b border-line md:block" />}>
        <Nav params={params} />
      </Suspense>
      {children}
    </div>
  );
}

async function Nav({ params }: Pick<LayoutProps<"/panel/[tenant]">, "params">) {
  const { tenant } = await params;
  // El menú muestra solo lo que el rol puede usar (cada página igual lo verifica).
  const access = await requireTenantAccess(tenant, "panel.view");
  const supabase = await createSupabaseServerClient();
  const newOrders = await countNewOrders(supabase, access.tenantId);

  const items: { key: NavKey; label: string; href: string }[] = [
    { key: "inicio", label: "Inicio", href: `/${tenant}` },
    { key: "pedidos", label: "Pedidos", href: `/${tenant}/pedidos` },
    { key: "productos", label: "Productos", href: `/${tenant}/productos` },
    ...(access.role === "owner" ? [{ key: "local" as const, label: "Mi local", href: `/${tenant}/ajustes` }] : []),
  ];

  return <TenantNav slug={tenant} items={items} newOrders={newOrders} />;
}
