import { createClient } from "@supabase/supabase-js";
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

const pendingUsers: string[] = [];

afterAll(async () => {
  const service = createSupabaseServiceClient();
  if (createdSlugs.length) await service.from("tenants").delete().in("slug", createdSlugs);
  for (const email of [invitedEmail, ...pendingUsers]) {
    const { data } = await service.rpc("admin_user_id_by_email", { p_email: email });
    if (data) await service.auth.admin.deleteUser(data as string);
  }
});

function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Inicia sesión como lo haría el dueño en el panel (devuelve el error de Auth, si hay). */
async function signInWith(email: string, password: string) {
  const { error } = await publicClient().auth.signInWithPassword({ email, password, options: { captchaToken: "XXXX.DUMMY.TOKEN.XXXX" } });
  return error;
}

/** Cliente con una sesión abierta (para ver si después se cierra). */
async function sessionFor(email: string, password: string) {
  const client = publicClient();
  const { error } = await client.auth.signInWithPassword({ email, password, options: { captchaToken: "XXXX.DUMMY.TOKEN.XXXX" } });
  if (error) throw new Error(error.message);
  return client;
}

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

  it("alta asistida: crea al dueño con una contraseña generada (sin correo) y su comercio en prueba", async () => {
    const slug = `asistido-${tag}`;
    createdSlugs.push(slug);
    const result = await admin.provisionAssisted(
      ADMIN,
      { ownerEmail: invitedEmail, name: "Comercio Asistido", slug, businessType: "general", whatsappPhone: "+5492954000044" },
      "localhost",
    );
    expect(result).toMatchObject({ ok: true, slug });
    const password = (result as { password?: string }).password;
    expect(password).toMatch(/^[A-Za-z2-9]{12}$/);
    expect(await signInWith(invitedEmail, password!)).toBeNull();

    const detail = await admin.getTenantDetail((result as { tenantId: string }).tenantId);
    expect(detail?.tenant.status).toBe("trial");
    expect(detail?.members.map((m) => [m.email, m.role])).toEqual([[invitedEmail, "owner"]]);
  });

  it("alta asistida para alguien que ya tiene cuenta: no toca su contraseña y suma el comercio", async () => {
    const slug = `sucursal-${tag}`;
    createdSlugs.push(slug);
    const result = await admin.provisionAssisted(
      ADMIN,
      { ownerEmail: SEED.users.ownerAlfa.email, name: "Alfa Sucursal", slug, businessType: "gastronomia", whatsappPhone: "+5492954000045" },
      "localhost",
    );
    expect(result).toMatchObject({ ok: true });
    expect((result as { password?: string }).password).toBeUndefined();
    const owner = await signInAs("ownerAlfa");
    const { data } = await owner.from("tenants").select("slug").order("slug");
    expect(data?.map((t) => t.slug)).toContain(slug);
  });

  it("nueva contraseña: el dueño entra con la nueva, se cierran sus sesiones y queda auditado sin la contraseña", async () => {
    const slug = createdSlugs[0];
    const service = createSupabaseServiceClient();
    const { data: tenant } = await service.from("tenants").select("id").eq("slug", slug).single();
    const first = await signInWith(invitedEmail, "no-es-esta");
    expect(first).not.toBeNull();

    // Una sesión abierta antes del cambio (por ejemplo, de quien vio la contraseña vieja).
    const before = await admin.resetOwnerPassword(ADMIN, tenant!.id, "prueba de sesiones");
    if (!before.ok) throw new Error(before.code);
    const opened = await sessionFor(invitedEmail, before.password);

    const result = await admin.resetOwnerPassword(ADMIN, tenant!.id, "se olvidó la contraseña");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.email).toBe(invitedEmail);
    expect(await signInWith(invitedEmail, result.password)).toBeNull();
    expect(await signInWith(invitedEmail, before.password)).not.toBeNull();
    const { error: refreshError } = await opened.auth.refreshSession();
    expect(refreshError).not.toBeNull();

    const { data: audit } = await service
      .from("audit_log")
      .select("changes, reason")
      .eq("tenant_id", tenant!.id)
      .eq("action", "owner.password_reset");
    expect(audit?.map((a) => a.reason)).toEqual(expect.arrayContaining(["se olvidó la contraseña"]));
    expect(JSON.stringify(audit)).not.toContain(result.password);
  });

  it("nueva contraseña: solo un superadmin y con motivo", async () => {
    expect(await admin.resetOwnerPassword(SEED.users.ownerAlfa.id, SEED.tenants.alfa, "motivo")).toEqual({
      ok: false,
      code: "not_superadmin",
    });
    expect(await admin.resetOwnerPassword(ADMIN, SEED.tenants.alfa, " ")).toEqual({ ok: false, code: "reason_required" });
  });

  it("alta asistida con una cuenta que nunca confirmó su correo: la toma, la confirma y le pone contraseña nueva", async () => {
    // Por ejemplo, alguien que se registró antes del rediseño, o un tercero que creó la cuenta
    // con el correo del dueño eligiendo él la contraseña: esa contraseña deja de servir.
    const email = `sin.confirmar.${tag}@example.com`;
    pendingUsers.push(email);
    const service = createSupabaseServiceClient();
    await service.auth.admin.createUser({ email, password: "La-del-tercero-2026", email_confirm: false });

    const slug = `sinconf-${tag}`;
    createdSlugs.push(slug);
    const result = await admin.provisionAssisted(
      ADMIN,
      { ownerEmail: email, name: "Comercio Sin Confirmar", slug, businessType: "general", whatsappPhone: "+5492954000046" },
      "localhost",
    );
    expect(result.ok).toBe(true);
    const password = (result as { password?: string }).password;
    expect(password).toBeDefined();
    expect(await signInWith(email, password!)).toBeNull();
    expect(await signInWith(email, "La-del-tercero-2026")).not.toBeNull();
  });

  it("alta asistida con una cuenta confirmada que nunca entró y no tiene comercios: también le da contraseña nueva", async () => {
    const email = `huerfana.${tag}@example.com`;
    pendingUsers.push(email);
    const service = createSupabaseServiceClient();
    await service.auth.admin.createUser({ email, password: "Nadie-la-sabe-2026", email_confirm: true });

    const slug = `huerfana-${tag}`;
    createdSlugs.push(slug);
    const result = await admin.provisionAssisted(
      ADMIN,
      { ownerEmail: email, name: "Comercio Huérfano", slug, businessType: "general", whatsappPhone: "+5492954000047" },
      "localhost",
    );
    const password = (result as { password?: string }).password;
    expect(password).toBeDefined();
    expect(await signInWith(email, password!)).toBeNull();
  });

  it("el barrido de fotos no borra fotos que siguen en uso ni archivos recientes", async () => {
    const result = await admin.sweepOrphanImages();
    expect(result.checked).toBeGreaterThan(0);
    expect(result.deleted).toBe(0);
  });
});
