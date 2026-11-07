import type { Metadata } from "next";

// admin.tuapp.com.ar · Solo accesible por reescritura desde el proxy.
// El panel central (con MFA obligatorio) llega en la etapa 9.
export const metadata: Metadata = {
  title: "Panel central",
  robots: { index: false, follow: false },
};

export default function AdminHome() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 p-8">
      <p className="text-sm uppercase tracking-wide opacity-60">Panel central</p>
      <h1 className="text-3xl font-semibold">Superadministración</h1>
      <p className="opacity-80">Página provisoria. Se construye en la etapa 9.</p>
    </main>
  );
}
