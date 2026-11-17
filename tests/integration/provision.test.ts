import { afterAll, describe, expect, it } from "vitest";
import { provisionTenant, setTenantPublished } from "@/core/tenancy/provision";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SEED, signInAs } from "./helpers";

/**
 * Alta de comercios con la base real (diseño, sección 10). Usa al usuario confirmado
 * sin comercio del seed (sin.comercio@example.com) y borra lo creado al terminar.
 */

const slug = `prueba-${Date.now().toString(36)}`;

afterAll(async () => {
  const service = createSupabaseServiceClient();
  await service.from("tenants").delete().eq("slug", slug);
});

describe("alta de comercios (base real)", () => {
  it("crea el comercio y el nuevo dueño lo ve con su sesión", async () => {
    const result = await provisionTenant(
      SEED.users.outsider.id,
      { name: "Local de Prueba", slug, businessType: "dietetica", whatsappPhone: "+5492954000077" },
      "localhost",
    );
    expect(result).toMatchObject({ ok: true, slug, created: true });

    const owner = await signInAs("outsider");
    const { data: tenants } = await owner.from("tenants").select("slug, status");
    expect(tenants).toEqual([{ slug, status: "trial" }]);

    const { data: categories } = await owner.from("catalog_categories").select("name").order("position");
    expect(categories?.map((c) => c.name)).toEqual(["Frutos secos", "Harinas", "Sin TACC", "Suplementos"]);
  });

  it("un segundo envío retoma el mismo comercio", async () => {
    const result = await provisionTenant(
      SEED.users.outsider.id,
      { name: "Otro nombre", slug: `${slug}-2`, businessType: "general", whatsappPhone: "+5492954000077" },
      "localhost",
    );
    expect(result).toMatchObject({ ok: true, slug, created: false });
  });

  it("un slug ocupado devuelve un error claro", async () => {
    const result = await provisionTenant(
      SEED.users.superadmin.id,
      { name: "Copia", slug: "alfa", businessType: "general", whatsappPhone: "+5492954000077" },
      "localhost",
    );
    expect(result).toEqual({ ok: false, error: "slug_taken" });
  });

  it("no se publica sin productos; los otros usuarios no pueden ver el comercio nuevo", async () => {
    const service = createSupabaseServiceClient();
    const { data: tenant } = await service.from("tenants").select("id").eq("slug", slug).single();
    expect(await setTenantPublished(tenant!.id, SEED.users.outsider.id, true)).toEqual({ ok: false, error: "no_products" });

    const alfaOwner = await signInAs("ownerAlfa");
    const { data } = await alfaOwner.from("tenants").select("id").eq("slug", slug);
    expect(data).toEqual([]);
  });

  it("slug_available responde con la sesión del usuario", async () => {
    const user = await signInAs("ownerBeta");
    expect((await user.rpc("slug_available", { p_slug: slug })).data).toBe(false);
    expect((await user.rpc("slug_available", { p_slug: `${slug}-libre` })).data).toBe(true);
  });
});
