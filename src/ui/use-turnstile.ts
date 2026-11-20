"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile en modo "execute": el widget se prepara al abrir el formulario
 * y recién al enviar se pide el token. Solo se muestra algo si Cloudflare necesita
 * una interacción (appearance: interaction-only).
 */

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.dataset.turnstile = "";
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile"))));
    script.addEventListener("error", () => reject(new Error("turnstile")));
  });
}

/** `theme`: "dark" en superficies siempre oscuras (página principal); "auto" sigue al sistema. */
export function useTurnstile(siteKey: string, theme: "auto" | "dark" = "auto") {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const pending = useRef<{ resolve: (t: string) => void; reject: (e: Error) => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then((turnstile) => {
        if (cancelled || !containerRef.current || widgetRef.current) return;
        widgetRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          execution: "execute",
          appearance: "interaction-only",
          language: "es",
          theme,
          callback: (token: string) => pending.current?.resolve(token),
          "error-callback": () => pending.current?.reject(new Error("turnstile")),
          "expired-callback": () => widgetRef.current && turnstile.reset(widgetRef.current),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (widgetRef.current) window.turnstile?.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [siteKey, theme]);

  const getToken = useCallback(
    () =>
      new Promise<string>((resolve, reject) => {
        const turnstile = window.turnstile;
        if (!turnstile || !widgetRef.current) return reject(new Error("turnstile"));
        const timer = setTimeout(() => reject(new Error("turnstile")), 20_000);
        pending.current = {
          resolve: (token) => (clearTimeout(timer), resolve(token)),
          reject: (error) => (clearTimeout(timer), reject(error)),
        };
        turnstile.reset(widgetRef.current);
        turnstile.execute(widgetRef.current);
      }),
    [],
  );

  return { containerRef, getToken };
}
