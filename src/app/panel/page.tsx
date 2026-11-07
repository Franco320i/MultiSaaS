import type { Metadata } from "next";

// app.tuapp.com.ar · Solo accesible por reescritura desde el proxy.
// Login y elección de comercio llegan en la etapa 3.
export const metadata: Metadata = {
  title: "Panel del comercio",
  robots: { index: false, follow: false },
};

export default function PanelHome() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 p-8">
      <p className="text-sm uppercase tracking-wide opacity-60">Panel del comercio</p>
      <h1 className="text-3xl font-semibold">Panel</h1>
      <p className="opacity-80">Página provisoria. El ingreso se agrega en la etapa 3.</p>
    </main>
  );
}
