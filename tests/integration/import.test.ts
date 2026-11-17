import { afterAll, describe, expect, it } from "vitest";
import { importProducts } from "@/modules/catalog/mutations";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SEED, signInAs } from "./helpers";

/** Importador de productos con sesiones reales (RLS actúa). Borra lo creado al terminar. */

const tag = `imp-${Date.now().toString(36)}`;

afterAll(async () => {
  const service = createSupabaseServiceClient();
  await service.from("catalog_products").delete().like("name", `%${tag}%`);
  await service.from("catalog_categories").delete().like("name", `%${tag}%`);
});

describe("importar productos (sesiones reales)", () => {
  it("crea productos publicados, reusa categorías existentes y crea las nuevas", async () => {
    const owner = await signInAs("ownerBeta");
    const result = await importProducts(owner, SEED.tenants.beta, [
      { line: 1, category: "remeras", name: `Remera blanca ${tag}`, description: null, price: 1400000 },
      { line: 2, category: `Buzos ${tag}`, name: `Buzo ${tag}`, description: "Frisa", price: 3000000 },
    ]);
    expect(result).toEqual({ created: 2, categoriesCreated: 1, failed: [] });

    const { data } = await owner
      .from("catalog_products")
      .select("name, is_published, catalog_categories(name)")
      .like("name", `%${tag}%`)
      .order("name");
    expect(data?.map((p) => [p.name, p.is_published, (p.catalog_categories as { name: string } | null)?.name])).toEqual([
      [`Buzo ${tag}`, true, `Buzos ${tag}`],
      [`Remera blanca ${tag}`, true, "Remeras"],
    ]);
  });

  it("aunque el código pasara el comercio equivocado, RLS no deja importar en otro comercio", async () => {
    const alfa = await signInAs("ownerAlfa");
    const result = await importProducts(alfa, SEED.tenants.beta, [
      { line: 1, category: null, name: `Intruso ${tag}`, description: null, price: 100 },
    ]);
    expect(result.created).toBe(0);
    expect(result.failed).toHaveLength(1);
  });
});
