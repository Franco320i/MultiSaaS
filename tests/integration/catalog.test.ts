import { afterAll, describe, expect, it } from "vitest";
import * as mutations from "@/modules/catalog/mutations";
import { listProducts } from "@/modules/catalog/queries";
import type { ProductInput } from "@/modules/catalog/mutations";
import { SEED, signInAs } from "./helpers";

const ALFA = SEED.tenants.alfa;
const BETA = SEED.tenants.beta;
const BETA_PRODUCT = "b2000000-0000-4000-8000-000000000001";
const BETA_CATEGORY = "b1000000-0000-4000-8000-000000000001";
const ALFA_BURGERS = "a1000000-0000-4000-8000-000000000001";

const tag = `prueba-${Date.now()}`;
const created: string[] = [];

function product(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: `Producto ${tag}`,
    description: null,
    category_id: null,
    price: 100_000,
    compare_at_price: null,
    is_published: false,
    is_available: true,
    is_featured: false,
    ...overrides,
  };
}

afterAll(async () => {
  const owner = await signInAs("ownerAlfa");
  for (const id of created) await mutations.deleteProduct(owner, ALFA, id);
});

describe("escrituras del catálogo (sesiones reales contra Supabase local)", () => {
  it("el dueño crea productos y los nombres repetidos reciben slug numerado", async () => {
    const owner = await signInAs("ownerAlfa");
    const first = await mutations.createProduct(owner, ALFA, product());
    const second = await mutations.createProduct(owner, ALFA, product());
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    created.push(first.id, second.id);

    const slugs = (await listProducts(owner, ALFA)).filter((p) => [first.id, second.id].includes(p.id)).map((p) => p.slug);
    expect(slugs.sort()).toEqual([`producto-${tag}`, `producto-${tag}-2`].sort());
  });

  it("el staff también puede crear productos", async () => {
    const staff = await signInAs("staffAlfa");
    const result = await mutations.createProduct(staff, ALFA, product({ name: `Staff ${tag}` }));
    expect(result.ok).toBe(true);
    if (result.ok) created.push(result.id);
  });

  it("con el comercio correcto, un id de producto ajeno no se encuentra", async () => {
    const owner = await signInAs("ownerAlfa");
    expect(await mutations.updateProduct(owner, ALFA, BETA_PRODUCT, product())).toEqual({
      ok: false,
      error: "El producto no existe.",
    });
    expect(await mutations.deleteProduct(owner, ALFA, BETA_PRODUCT)).toEqual({ ok: false, error: "El producto no existe." });
    expect(await mutations.setProductFlag(owner, ALFA, BETA_PRODUCT, "is_published", false)).toEqual({
      ok: false,
      error: "El producto no existe.",
    });
  });

  it("aunque el código pasara el tenantId de Beta por error, RLS no deja escribir en Beta", async () => {
    const owner = await signInAs("ownerAlfa");
    expect(await mutations.createProduct(owner, BETA, product({ name: `Intruso ${tag}` }))).toEqual({
      ok: false,
      error: "No tenés permiso para hacer esto.",
    });
    expect(await mutations.updateProduct(owner, BETA, BETA_PRODUCT, product())).toEqual({
      ok: false,
      error: "El producto no existe.",
    });
    expect(await mutations.deleteCategory(owner, BETA, BETA_CATEGORY)).toEqual({
      ok: false,
      error: "La categoría no existe.",
    });

    const beta = await signInAs("ownerBeta");
    const betaProducts = await listProducts(beta, BETA);
    expect(betaProducts.find((p) => p.id === BETA_PRODUCT)?.name).toBe("Remera negra");
  });

  it("no se puede asignar una categoría de otro comercio", async () => {
    const owner = await signInAs("ownerAlfa");
    expect(await mutations.createProduct(owner, ALFA, product({ category_id: BETA_CATEGORY }))).toEqual({
      ok: false,
      error: "La categoría elegida no existe.",
    });
  });

  it("subir y bajar intercambia posiciones dentro de la categoría", async () => {
    const owner = await signInAs("ownerAlfa");
    const before = (await listProducts(owner, ALFA, { categoryId: ALFA_BURGERS })).map((p) => p.id);
    expect(before.length).toBeGreaterThanOrEqual(2);

    await mutations.move(owner, "catalog_products", ALFA, before[1], "up");
    const after = (await listProducts(owner, ALFA, { categoryId: ALFA_BURGERS })).map((p) => p.id);
    expect(after.slice(0, 2)).toEqual([before[1], before[0]]);

    await mutations.move(owner, "catalog_products", ALFA, before[1], "down");
    const restored = (await listProducts(owner, ALFA, { categoryId: ALFA_BURGERS })).map((p) => p.id);
    expect(restored).toEqual(before);
  });
});
