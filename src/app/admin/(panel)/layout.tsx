import { Suspense } from "react";
import { signOutAction } from "@/app/auth/actions";
import { requirePlatformAdmin } from "@/core/admin/access";
import { AdminNav } from "./admin-nav";

/**
 * Estructura del panel central: menú lateral fijo en pantallas grandes, arriba en el
 * celular. El acceso lo verifica también cada página y cada acción (requirePlatformAdmin).
 */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <Suspense fallback={<aside className="border-b border-line bg-surface md:w-56 md:border-r md:border-b-0" />}>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

async function Sidebar() {
  const access = await requirePlatformAdmin("/");
  return (
    <aside className="flex flex-col gap-1 border-b border-line bg-surface px-3 py-4 md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0 md:border-r md:border-b-0">
      <p className="flex items-center gap-2.5 px-2 pb-3 font-semibold">
        <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-accent text-[12px] font-bold text-accent-foreground">
          tu
        </span>
        Panel central
      </p>
      <AdminNav />
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-2 pt-3 text-[13px] text-muted md:flex-col md:items-start">
        <p className="hidden md:block">
          {access.email}
          <br />
          {access.role === "superadmin" ? "Superadmin" : "Soporte (solo lectura)"} · MFA activo
        </p>
        <form action={signOutAction}>
          <button type="submit" className="admin-btn rounded-lg border border-line px-2.5 py-1 font-semibold text-muted hover:text-foreground">
            Salir
          </button>
        </form>
      </div>
    </aside>
  );
}
