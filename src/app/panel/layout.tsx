import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/core/auth/session";
import { ToastProvider } from "@/ui/toast";

// app.tuapp.com.ar · Solo accesible por reescritura desde el proxy.
// La sesión se lee dentro de <Suspense> (Next 16 con Cache Components) y nada
// de este segmento se cachea (diseño, sección 12).
export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel" },
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <div data-surface="panel" className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5 md:px-6">
        <Link href="/" className="font-display text-[20px]">
          Vidri
        </Link>
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </header>
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <form action={signOutAction} className="flex min-w-0 items-center gap-3 text-[14px]">
      <span className="hidden truncate text-muted sm:inline">{user.email}</span>
      <button type="submit" className="min-h-11 rounded-full border border-line px-4 font-semibold">
        Salir
      </button>
    </form>
  );
}
