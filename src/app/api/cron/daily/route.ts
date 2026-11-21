import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { runDailyMaintenance, sweepOrphanImages, tenantHosts } from "@/core/admin/service";
import { cacheTags } from "@/lib/cache/tags";
import { env } from "@/lib/env";

/**
 * GET /api/cron/daily · Tarea diaria (diseño, sección 9). La llama Vercel Cron una vez
 * por día (vercel.json) con "Authorization: Bearer <CRON_SECRET>".
 *
 * 1. Vencimientos: prueba o período vencido sin pago → pago pendiente (private.daily_maintenance,
 *    idempotente). El catálogo sigue visible y nunca se suspende solo: con cobro manual, suspender
 *    es una decisión del panel central (decisión del 2026-11-21). Sin correos a los comercios.
 * 2. Limpieza: rate_limits viejos (en la misma función) y fotos huérfanas en Storage.
 */

function authorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "No autorizado." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const maintenance = await runDailyMaintenance();
  for (const tenantId of maintenance.past_due) {
    // El estado del comercio cambió: que el catálogo cacheado lo refleje.
    revalidateTag(cacheTags.tenantSettings(tenantId), { expire: 0 });
    for (const host of await tenantHosts(tenantId)) revalidateTag(cacheTags.host(host), { expire: 0 });
  }

  const sweep = await sweepOrphanImages();

  return Response.json(
    {
      pastDue: maintenance.past_due.length,
      rateLimitsCleaned: maintenance.rate_limits_cleaned,
      orphanImages: sweep,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
