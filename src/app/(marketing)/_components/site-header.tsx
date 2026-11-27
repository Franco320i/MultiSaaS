import Link from "next/link";
import { ButtonLink } from "./button-link";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NAV_LINKS } from "./nav-links";

/** Menú fijo de la página principal. */
export function SiteHeader({ demoRequest }: { demoRequest: string | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/80 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex min-h-11 items-center" aria-label="Vidri, inicio">
          <Logo />
        </Link>
        <nav aria-label="Secciones" className="hidden md:block">
          <ul className="flex items-center gap-7 text-[15px] text-muted">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="transition-colors hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          {demoRequest ? (
            <ButtonLink href={demoRequest} className="px-5">
              Pedí tu demo
            </ButtonLink>
          ) : null}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
