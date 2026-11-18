import type { Metadata } from "next";

// admin.tuapp.com.ar · Panel central (solo por reescritura del proxy). Siempre oscuro:
// data-surface="admin" activa los tokens "Grafito" (docs/design/sistema-visual.md).
export const metadata: Metadata = {
  title: { default: "Panel central", template: "%s · Panel central" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div data-surface="admin" className="flex min-h-full flex-1 flex-col bg-background text-foreground">
      {children}
    </div>
  );
}
