import type { Metadata } from "next";
import { env } from "@/lib/env";
import { platformUrl } from "@/lib/urls";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

// vidri.ar · Página principal, registro y legales. Siempre oscura:
// data-surface="marketing" activa los tokens "Noche" (docs/design/sistema-visual.md).
export const metadata: Metadata = {
  title: { default: "Vidri · Catálogos con pedidos a WhatsApp", template: "%s · Vidri" },
  description:
    "Tu catálogo, con tu marca, en un link. Tus clientes eligen, arman el pedido y te llega al WhatsApp ya escrito. 14 días gratis, sin tarjeta.",
};

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  // El login vive en el host del panel (app.).
  const loginUrl = platformUrl(env.ROOT_DOMAIN, "app", "/auth/login");
  return (
    <div data-surface="marketing" className="relative flex min-h-full flex-1 flex-col overflow-x-clip bg-background text-foreground">
      <SiteHeader loginUrl={loginUrl} />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter loginUrl={loginUrl} />
    </div>
  );
}
