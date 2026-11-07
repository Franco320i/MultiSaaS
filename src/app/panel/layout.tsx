import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/core/auth/session";

// app.tuapp.com.ar · Solo accesible por reescritura desde el proxy.
// La sesión se lee dentro de <Suspense> (Next 16 con Cache Components) y nada
// de este segmento se cachea (diseño, sección 12).
export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel" },
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-foreground/10 px-6 py-3">
        <Link href="/" className="font-semibold">
          Panel
        </Link>
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </header>
      {children}
    </div>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <form action={signOutAction} className="flex items-center gap-3 text-sm">
      <span className="opacity-70">{user.email}</span>
      <button type="submit" className="underline">
        Salir
      </button>
    </form>
  );
}
