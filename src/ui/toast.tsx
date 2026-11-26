"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Aviso breve ("Se guardó"): uno por vez, abajo al centro, se va solo a los 3 s.
 * En el celular queda por encima del menú fijo de abajo (64 px) y de la barra del iPhone.
 */
type Tone = "ok" | "error";
type Toast = { id: number; message: string; tone: Tone };

const ToastContext = createContext<{ show: (message: string, tone?: Tone) => void } | null>(null);

const DURATION_MS = 3000;

/**
 * `aboveBar`: hay una barra fija abajo en todas las pantallas (la del pedido en el catálogo),
 * así que el aviso queda por encima también en tablet y compu.
 */
export function ToastProvider({ children, aboveBar = false }: { children: ReactNode; aboveBar?: boolean }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: Tone = "ok") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Región que se anuncia sola. Sin role="status": vacía, competiría con los mensajes de cada pantalla. */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className={`pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] ${
          aboveBar ? "" : "md:bottom-6"
        }`}
      >
        {toast ? (
          <p
            key={toast.id}
            className="flex items-center gap-2 rounded-full border border-line bg-surface py-2 pr-4 pl-2 text-[15px] font-semibold text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_-12px_rgb(0_0_0/0.25)]"
          >
            <span
              aria-hidden
              className={`grid size-6 place-items-center rounded-full text-[13px] font-bold ${
                toast.tone === "ok" ? "bg-accent text-accent-foreground" : "bg-danger text-background"
              }`}
            >
              {toast.tone === "ok" ? "✓" : "!"}
            </span>
            {toast.message}
          </p>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

/** Fuera del proveedor no hace nada (por ejemplo, en una prueba o en otra superficie). */
const NOOP = { show: () => {} };

export function useToast(): { show: (message: string, tone?: Tone) => void } {
  return useContext(ToastContext) ?? NOOP;
}
