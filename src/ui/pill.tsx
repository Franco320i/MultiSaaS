import type { ReactNode } from "react";

/** Píldora de estado: punto + texto, nunca solo color (docs/design/sistema-visual.md). */
export type PillTone = "neutral" | "accent" | "warning" | "info" | "plum" | "danger";

const TONES: Record<PillTone, string> = {
  neutral: "bg-surface-muted text-muted",
  accent: "bg-accent-soft text-accent",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  plum: "bg-plum-soft text-plum",
  danger: "bg-danger-soft text-danger",
};

export function Pill({ tone = "neutral", children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${TONES[tone]}`}>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  );
}
