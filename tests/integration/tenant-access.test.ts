import { describe, expect, it } from "vitest";
import { listMyTenants, resolveTenantAccess } from "@/core/tenancy/access";
import { SEED, signInAs, type SeedUser } from "./helpers";

async function access(user: SeedUser, slug: string, permission: Parameters<typeof resolveTenantAccess>[3]) {
  const client = await signInAs(user);
  return resolveTenantAccess(client, SEED.users[user].id, slug, permission);
}

describe("resolveTenantAccess (sesiones reales contra Supabase local)", () => {
  it("el dueño de Alfa entra a Alfa como dueño", async () => {
    const result = await access("ownerAlfa", "alfa", "panel.view");
    expect(result).toEqual({
      ok: true,
      access: { tenantId: SEED.tenants.alfa, slug: "alfa", name: "Burger Alfa", status: "active", role: "owner" },
    });
  });

  it("el dueño de Alfa recibe not-found en Beta y en Gamma", async () => {
    expect(await access("ownerAlfa", "beta", "panel.view")).toEqual({ ok: false, reason: "not-found" });
    expect(await access("ownerAlfa", "gamma", "panel.view")).toEqual({ ok: false, reason: "not-found" });
  });

  it("un comercio inexistente y uno existente ajeno responden igual (no se confirma que exista)", async () => {
    const inexistente = await access("ownerAlfa", "no-existe-este", "panel.view");
    const ajeno = await access("ownerAlfa", "beta", "panel.view");
    expect(inexistente).toEqual(ajeno);
  });

  it("slugs inválidos o reservados ni siquiera consultan la base", async () => {
    expect(await access("ownerAlfa", "admin", "panel.view")).toEqual({ ok: false, reason: "not-found" });
    expect(await access("ownerAlfa", "../alfa", "panel.view")).toEqual({ ok: false, reason: "not-found" });
    expect(await access("ownerAlfa", "ALFA", "panel.view")).toEqual({ ok: false, reason: "not-found" });
  });

  it("el staff de Alfa entra, pero sin permisos de dueño", async () => {
    expect(await access("staffAlfa", "alfa", "catalog.write")).toMatchObject({ ok: true, access: { role: "staff" } });
    expect(await access("staffAlfa", "alfa", "settings.write")).toMatchObject({ ok: false, reason: "forbidden" });
    expect(await access("staffAlfa", "alfa", "billing.view")).toMatchObject({ ok: false, reason: "forbidden" });
  });

  it("el dueño de un comercio suspendido entra (el panel mostrará el estado)", async () => {
    expect(await access("ownerGamma", "gamma", "panel.view")).toMatchObject({
      ok: true,
      access: { status: "suspended", role: "owner" },
    });
  });

  it("un usuario sin comercio y el superadmin (con su sesión normal) no entran a ninguno", async () => {
    for (const user of ["outsider", "superadmin"] as const) {
      for (const slug of ["alfa", "beta", "gamma"]) {
        expect(await access(user, slug, "panel.view")).toEqual({ ok: false, reason: "not-found" });
      }
    }
  });

  it("aunque el código pasara el id de otro usuario, RLS no muestra membresías de otros comercios", async () => {
    const client = await signInAs("ownerAlfa");
    const result = await resolveTenantAccess(client, SEED.users.ownerBeta.id, "beta", "panel.view");
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("listMyTenants", () => {
  it("cada usuario ve solo sus comercios", async () => {
    const ownerAlfa = await signInAs("ownerAlfa");
    expect(await listMyTenants(ownerAlfa, SEED.users.ownerAlfa.id)).toEqual([
      { role: "owner", slug: "alfa", name: "Burger Alfa", status: "active" },
    ]);

    const outsider = await signInAs("outsider");
    expect(await listMyTenants(outsider, SEED.users.outsider.id)).toEqual([]);
  });
});
