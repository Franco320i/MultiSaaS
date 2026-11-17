"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Actualización periódica de la lista de pedidos (diseño, sección 11: cada 20 s, sin
 * Realtime en v1) y aviso en la pestaña: "(2) Pedidos" mientras haya pedidos nuevos.
 * Solo consulta con la pestaña visible; al volver a la pestaña, actualiza enseguida.
 */
export function OrdersAutoRefresh({ newCount, title }: { newCount: number; title: string }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, 20_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);

  useEffect(() => {
    document.title = newCount > 0 ? `(${newCount}) ${title}` : title;
  }, [newCount, title]);

  return null;
}
