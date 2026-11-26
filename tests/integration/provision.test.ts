import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setTenantPublished } from "@/core/tenancy/provision";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SEED, signInAs } from "./helpers";

/**
 * Alta y publicación con la base real (diseño, sección 10; rediseño 11e: sin registro
 * automático, los comercios los crea el panel central). Usa al usuario confirmado sin
 * comercio del seed (sin.comercio@example.com) y borra lo creado al terminar.
 */

const slug = `prueba-${Date.now().toString(36)}`;
let tenantId: string;

beforeAll(async () => {
  // Como la alta asistida: la base verifica al superadmin y crea el comercio en prueba.
  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("admin_provision_tenant", {
    p_actor: SEED.users.superadmin.id,
    p_owner_id: SEED.users.outsider.id,
    p_input: { name: "Local de Prueba", slug, business_type: "dietetica", whatsapp_phone: "+5492954000077" },
    p_root_domain: "localhost",
  });
  if (error) throw new Error(`No se pudo crear el comercio de prueba: ${error.message}`);
  tenantId = (data as { tenant_id: string }).tenant_id;
});

afterAll(async () => {
  const service = createSupabaseServiceClient();
  await service.from("tenants").delete().eq("slug", slug);
});

describe("alta y publicación de comercios (base real)", () => {
  it("el registro directo está cerrado: nadie crea una cuenta sin el panel central", async () => {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signUp({
      email: `intruso-${Date.now().toString(36)}@example.com`,
      password: "Clave-de-prueba-2026",
      options: { captchaToken: "XXXX.DUMMY.TOKEN.XXXX" },
    });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });

  it("el dueño ve su comercio nuevo con su sesión, con las categorías del rubro", async () => {
    const owner = await signInAs("outsider");
    const { data: tenants } = await owner.from("tenants").select("slug, status");
    expect(tenants).toEqual([{ slug, status: "trial" }]);

    const { data: categories } = await owner.from("catalog_categories").select("name").order("position");
    expect(categories?.map((c) => c.name)).toEqual(["Frutos secos", "Harinas", "Sin TACC", "Suplementos"]);
  });

  it("no se publica sin productos; los otros usuarios no pueden ver el comercio nuevo", async () => {
    expect(await setTenantPublished(tenantId, SEED.users.outsider.id, true)).toEqual({ ok: false, error: "no_products" });

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
