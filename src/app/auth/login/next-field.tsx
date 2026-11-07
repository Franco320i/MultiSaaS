"use client";

import { useSearchParams } from "next/navigation";

/** Pasa el destino posterior al login. El servidor lo vuelve a validar con safeRedirectPath. */
export function NextField() {
  const next = useSearchParams().get("next");
  return next ? <input type="hidden" name="next" value={next} /> : null;
}
