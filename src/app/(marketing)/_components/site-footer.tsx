import { cacheLife } from "next/cache";
import Link from "next/link";
import { Logo } from "./logo";
import { NAV_LINKS } from "./nav-links";

/** Con cacheComponents, la hora solo se puede leer dentro de una función cacheada. */
async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/** Pie de la página principal y de las páginas legales. */
export async function SiteFooter() {
  const year = await currentYear();
  const link = "flex min-h-11 items-center text-muted transition-colors hover:text-foreground";
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr] md:px-6">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-[15px] text-muted">Catálogos con pedidos a WhatsApp para comercios argentinos.</p>
        </div>
        <nav aria-label="Secciones de la página">
          <ul className="text-[15px]">
            {NAV_LINKS.map((item) => (
              <li key={item.href}>
                <a href={item.href} className={link}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legales">
          <ul className="text-[15px]">
            <li>
              <Link href="/terminos" className={link}>
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className={link}>
                Política de privacidad
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-[14px] text-muted md:px-6">© {year} Vidri</p>
    </footer>
  );
}
