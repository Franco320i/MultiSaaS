import { ButtonLink } from "./button-link";

/** Invitación a abrir el catálogo de ejemplo. Solo se monta si `demo.{dominio}` existe y está publicado. */
export function DemoBand({ url }: { url: string }) {
  return (
    <section aria-labelledby="ejemplo-titulo" className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <h2 id="ejemplo-titulo" className="font-display text-[26px] leading-tight md:text-[32px]">
            Probalo como lo vería tu cliente.
          </h2>
          <p className="mt-2 text-[17px] text-muted">Abrí un catálogo de ejemplo en tu celular y armá un pedido.</p>
        </div>
        <ButtonLink href={url} variant="ghost">
          Mirá un catálogo de ejemplo
        </ButtonLink>
      </div>
    </section>
  );
}
