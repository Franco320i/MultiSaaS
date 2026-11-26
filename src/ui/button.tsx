import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button-classes";

/** Botón común del panel. Para un link con forma de botón, usar ButtonLink. */
export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
