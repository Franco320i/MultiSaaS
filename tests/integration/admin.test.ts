import { afterAll, describe, expect, it } from "vitest";
import * as admin from "@/core/admin/service";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SEED, signInAs } from "./helpers";

/**
 * Panel central contra la base real (diseño, sección 9). Restaura lo que cambia;
 * `npm run db:reset` deja todo como al principio.
 */

const ADMIN = SEED.users.superadmin.id;
const tag = Date.now().toString(36);
const createdSlugs: string[] = [];
const invitedEmail = `dueno.${tag}@example.com`;

afterAll(async () => {
  const service = createSupabaseServiceClient();
  if (createdSlugs.length) await service.from("tenants").delete().in("slug", createdSlugs);
  const { data } = await service.rpc("admin_user_id_by_email", { p_email: invitedEmail });
  if (data) await service.auth.admin.deleteUser(data as string);
});

describe("panel central (base real, clave secreta local)", () => {
  it("suspender y reactivar quedan auditados; un dueño no puede hacerlo", async () => {
    expect(await admin.setTenantStatus(SEED.users.ownerAlfa.id, SEED.tenants.beta, "suspended", "intento")).toEqual({
      ok: false,
      code: "not_superadmin",
    });
    expect(await admin.setTenantStatus(ADMIN, SEED.tenants.beta, "suspended", `Prueba ${tag}`)).toEqual({ ok: true });
    expect(await admin.setTenantStatus(ADMIN, SEED.tenants.beta, "active", `Fin prueba ${tag}`)).toEqual({ ok: true });

    const { rows } = await admin.listAudit({ tenantId: SEED.tenants.beta, page: 1, pageSize: 10 });
    expect(rows.slice(0, 2).map((r) => [r.action, r.reason])).toEqual([
      ["tenant.reactivated", `Fin prueba ${tag}`],
      ["tenant.suspended", `Prueba ${tag}`],
    ]);
  });

  it("la dueña de Beta ve en su auditoría que el panel central la suspendió", async () => {
    const owner = await signInAs("ownerBeta");
    const { data } = await owner.from("audit_log").select("action, reason").eq("reason", `Prueba ${tag}`);
    expect(data).toEqual([{ action: "tenant.suspended", reason: `Prueba ${tag}` }]);
  });

  it("la lista filtra por excepción y busca", async () => {
    const all = await admin.listTenants({ search: "", filter: "all", page: 1, pageSize: 25 });
    expect(all.total).toBeGreaterThanOrEqual(3);
    const found = await admin.listTenants({ search: "burger", filter: "all", page: 1, pageSize: 25 });
    expect(found.rows.map((r) => r.slug)).toEqual(["alfa"]);
  });

  it("la tarea diaria es idempotente", async () => {
    await admin.runDailyMaintenance();
    const second = await admin.runDailyMaintenance();
    expect(second).toEqual({ past_due: [], rate_limits_cleaned: 0 });
  });

  it("alta asistida: invita al dueño nuevo y crea su comercio en prueba", async () => {
    const slug = `asistido-${tag}`;
    createdSlugs.push(slug);
    const result = await admin.provisionAssisted(
      ADMIN,
      { ownerEmail: invitedEmail, name: "Comercio Asistido", slug, businessType: "general", whatsappPhone: "+5492954000044" },
      "localhost",
      "http://app.localhost:3000/auth/callback?next=%2Fauth%2Fnueva-contrasena",
    );
    expect(result).toMatchObject({ ok: true, slug, invited: true });

    const detail = await admin.getTenantDetail((result as { tenantId: string }).tenantId);
    expect(detail?.tenant.status).toBe("trial");
    expect(detail?.members.map((m) => [m.email, m.role])).toEqual([[invitedEmail, "owner"]]);
  });

  it("alta asistida para alguien que ya tiene cuenta: no invita y suma el comercio", async () => {
    const slug = `sucursal-${tag}`;
    createdSlugs.push(slug);
    const result = await admin.provisionAssisted(
      ADMIN,
      { ownerEmail: SEED.users.ownerAlfa.email, name: "Alfa Sucursal", slug, businessType: "gastronomia", whatsappPhone: "+5492954000045" },
      "localhost",
      "http://app.localhost:3000/auth/callback",
    );
    expect(result).toMatchObject({ ok: true, invited: false });
    const owner = await signInAs("ownerAlfa");
    const { data } = await owner.from("tenants").select("slug").order("slug");
    expect(data?.map((t) => t.slug)).toContain(slug);
  });

  it("el barrido de fotos no borra fotos que siguen en uso ni archivos recientes", async () => {
    const result = await admin.sweepOrphanImages();
    expect(result.checked).toBeGreaterThan(0);
    expect(result.deleted).toBe(0);
  });
});
