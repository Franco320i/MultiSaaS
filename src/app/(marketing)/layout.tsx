import type { Metadata } from "next";
import { demoRequestUrl } from "@/lib/demo-request";
import { env } from "@/lib/env";
import { platformUrl } from "@/lib/urls";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

// vidri.ar · Página principal y legales. Siempre oscura:
// data-surface="marketing" activa los tokens "Noche" (docs/design/sistema-visual.md).
export const metadata: Metadata = {
  // Para que la imagen al compartir salga con la dirección completa del entorno.
  metadataBase: new URL(platformUrl(env.ROOT_DOMAIN, null)),
  title: { default: "Vidri · Catálogos con pedidos a WhatsApp", template: "%s · Vidri" },
  description:
    "Tu catálogo, con tu marca, en un link. Tus clientes eligen, arman el pedido y te llega al WhatsApp ya escrito. 14 días gratis, sin tarjeta.",
};

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  // Sin link al login: los comercios entran al panel con el link que les manda la plataforma.
  return (
    <div data-surface="marketing" className="relative flex min-h-full flex-1 flex-col overflow-x-clip bg-background text-foreground">
      <SiteHeader demoRequest={demoRequestUrl(env.SALES_WHATSAPP)} />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
