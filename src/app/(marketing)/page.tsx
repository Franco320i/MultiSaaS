import Link from "next/link";

// tuapp.com.ar · Landing provisoria. El contenido comercial llega más adelante.
export default function MarketingHome() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-5 px-4 py-12">
      <h1 className="font-display text-[36px] leading-tight text-balance">Catálogos digitales para tu comercio</h1>
      <p className="text-muted">
        Tu catálogo con tu marca, pedidos que llegan por WhatsApp y un panel para manejarlos desde el celular.
      </p>
      <Link
        href="/registro"
        className="flex min-h-12 w-fit items-center rounded-full bg-accent px-6 text-[16px] font-semibold text-accent-foreground"
      >
        Crear mi catálogo
      </Link>
    </main>
  );
}
