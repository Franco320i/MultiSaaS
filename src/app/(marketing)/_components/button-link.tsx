import Link from "next/link";
import type { ReactNode } from "react";

const base =
  "inline-flex min-h-11 items-center justify-center rounded-full px-6 text-[15px] font-semibold transition-[transform,filter] duration-150 hover:-translate-y-px hover:brightness-110 active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const variants = {
  primary: "bg-accent text-accent-foreground shadow-[0_10px_30px_-10px_rgba(124,58,237,0.7)]",
  ghost: "border border-line text-foreground hover:border-accent-soft",
};

/** Botón con forma de píldora que navega. Los links externos (otro host) usan <a>. */
export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: keyof typeof variants;
  className?: string;
  children: ReactNode;
}) {
  const classes = `${base} ${variants[variant]} ${className}`;
  if (href.startsWith("http")) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
