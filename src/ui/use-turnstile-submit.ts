"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTurnstile } from "./use-turnstile";

/**
 * Formulario con Turnstile: al enviar, pide el token a Cloudflare, lo pone en el campo
 * oculto `turnstileToken` y recién ahí envía. El token es de un solo uso: lo verifica
 * Supabase Auth (captcha del proyecto), no nuestro servidor.
 *
 * Uso: `<form ref={formRef} onSubmit={onSubmit}>` + `<input ref={tokenRef} type="hidden"
 * name="turnstileToken" />` + `<div ref={containerRef} />`.
 */
export function useTurnstileSubmit(siteKey: string, theme: "auto" | "dark" = "auto") {
  const formRef = useRef<HTMLFormElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);
  const { containerRef, getToken } = useTurnstile(siteKey, theme);
  const [verifying, setVerifying] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (tokenRef.current?.value) return; // segundo paso: ya tiene token, se envía.
    event.preventDefault();
    setVerifying(true);
    const token = await getToken().catch(() => "");
    setVerifying(false);
    if (tokenRef.current) tokenRef.current.value = token;
    formRef.current?.requestSubmit();
    if (tokenRef.current) tokenRef.current.value = "";
  }

  return { formRef, tokenRef, containerRef, onSubmit, verifying };
}
