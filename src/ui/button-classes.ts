/**
 * Clases del botón común del panel (docs/design/sistema-visual.md, "Piezas comunes").
 * Verde = hacer algo; uno solo principal por zona. Siempre píldora y 44 px en el celular.
 */
export type ButtonVariant = "primary" | "secondary" | "soft" | "text" | "whatsapp" | "danger";
export type ButtonSize = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

// El tamaño fija alto y letra; el relleno lo pone la variante (las de texto llevan menos).
const SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 text-[16px]",
  sm: "min-h-9 text-[14px]",
};
const PADDING: Record<ButtonSize, string> = { md: "px-5", sm: "px-4" };
const TEXT_VARIANTS = new Set<ButtonVariant>(["text", "danger"]);

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:brightness-110",
  secondary: "border border-line-strong bg-surface text-foreground hover:bg-surface-muted",
  soft: "bg-surface-muted text-foreground hover:brightness-95",
  text: "text-accent hover:underline",
  // Se oscurece al pasar el mouse: aclararlo bajaría el contraste del texto blanco.
  whatsapp: "bg-whatsapp text-white hover:brightness-95",
  danger: "text-danger hover:underline",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string): string {
  const padding = TEXT_VARIANTS.has(variant) ? "px-2" : PADDING[size];
  return [BASE, SIZES[size], padding, VARIANTS[variant], extra].filter(Boolean).join(" ");
}
