import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { runDailyMaintenance, sweepOrphanImages, tenantHosts } from "@/core/admin/service";
import { cacheTags } from "@/lib/cache/tags";
import { env } from "@/lib/env";

/**
 * GET /api/cron/daily · Tarea diaria (diseño, sección 9). La llama Vercel Cron una vez
 * por día (vercel.json) con "Authorization: Bearer <CRON_SECRET>".
 *
 * 1. Vencimientos: prueba o período vencido → pago pendiente; 5 días después → suspendido
 *    (private.daily_maintenance, idempotente). Invalida el catálogo de cada comercio que cambió.
 * 2. Limpieza: rate_limits viejos (en la misma función) y fotos huérfanas en Storage.
 * 3. Avisos de prueba por vencer: por ahora quedan en el log y en la respuesta; el envío
 *    por correo se conecta con Resend en la etapa 10.
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
  const changed = [...maintenance.past_due, ...maintenance.suspended];
  for (const tenantId of changed) {
    // Lo suspendido tiene que dejar de verse ya: sin servir la versión vieja.
    revalidateTag(cacheTags.tenantSettings(tenantId), { expire: 0 });
    for (const host of await tenantHosts(tenantId)) revalidateTag(cacheTags.host(host), { expire: 0 });
  }

  const sweep = await sweepOrphanImages();

  if (maintenance.notify_trial_ending.length > 0) {
    // TODO etapa 10: enviar con Resend. Sin datos personales en el log: solo id y días.
    console.info("Pruebas por vencer (avisar por correo)", maintenance.notify_trial_ending.map((t) => ({ tenant: t.tenant_id, days: t.days_left })));
  }

  return Response.json(
    {
      pastDue: maintenance.past_due.length,
      suspended: maintenance.suspended.length,
      rateLimitsCleaned: maintenance.rate_limits_cleaned,
      trialEndingNotices: maintenance.notify_trial_ending.length,
      orphanImages: sweep,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
