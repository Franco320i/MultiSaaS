import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import { processProductImage } from "@/lib/images/process";
import { imageObjectName, publicImageUrl } from "@/lib/images/url";
import { addProductImage, BUCKET, deleteProductImage, listProductImages } from "@/modules/catalog/images";
import { createProduct, deleteProduct } from "@/modules/catalog/mutations";
import { SEED, signInAs } from "./helpers";

const ALFA = SEED.tenants.alfa;
const BETA = SEED.tenants.beta;
const ALFA_PRODUCT = "a2000000-0000-4000-8000-000000000002"; // Hamburguesa simple (sin fotos en el seed)
const BETA_PRODUCT = "b2000000-0000-4000-8000-000000000001";

const created: { tenant: string; imageId: string }[] = [];

async function photo() {
  const input = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "orange" } }).jpeg().toBuffer();
  return processProductImage(input);
}

async function status(url: string) {
  return (await fetch(url)).status;
}

afterAll(async () => {
  const owner = await signInAs("ownerAlfa");
  for (const { tenant, imageId } of created) await deleteProductImage(owner, tenant, imageId);
});

describe("fotos de productos (Storage real con sesiones reales)", () => {
  it("el dueño sube una foto: quedan los dos tamaños públicos en la carpeta de su comercio", async () => {
    const owner = await signInAs("ownerAlfa");
    const result = await addProductImage(owner, ALFA, ALFA_PRODUCT, await photo());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    created.push({ tenant: ALFA, imageId: result.id });

    const [image] = (await listProductImages(owner, ALFA, ALFA_PRODUCT)).filter((i) => i.id === result.id);
    expect(image.storage_path).toBe(`${ALFA}/products/${ALFA_PRODUCT}/${result.id}`);
    expect([image.width, image.height]).toEqual([1280, 960]);

    const response = await fetch(publicImageUrl(image.storage_path, 480));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(await status(publicImageUrl(image.storage_path, 1280))).toBe(200);
  });

  it("aunque el código pasara el comercio equivocado, no se puede subir a un producto de Beta", async () => {
    const owner = await signInAs("ownerAlfa");
    expect(await addProductImage(owner, BETA, BETA_PRODUCT, await photo())).toEqual({
      ok: false,
      error: "El producto no existe.",
    });
  });

  it("subiendo directo a Storage (salteando el servidor) no se puede escribir en la carpeta de Beta", async () => {
    const owner = await signInAs("ownerAlfa");
    const image = await photo();
    const { error } = await owner.storage
      .from(BUCKET)
      .upload(`${BETA}/products/${BETA_PRODUCT}/intruso-480.webp`, image.files[480], { contentType: "image/webp" });
    expect(error).not.toBeNull();
  });

  it("el bucket solo acepta WebP: no se puede subir otra cosa aunque sea en la propia carpeta", async () => {
    const owner = await signInAs("ownerAlfa");
    const { error } = await owner.storage
      .from(BUCKET)
      .upload(`${ALFA}/products/${ALFA_PRODUCT}/pagina.html`, Buffer.from("<script>alert(1)</script>"), {
        contentType: "text/html",
      });
    expect(error).not.toBeNull();
  });

  it("la dueña de Beta no puede borrar las fotos de Alfa", async () => {
    const owner = await signInAs("ownerAlfa");
    const result = await addProductImage(owner, ALFA, ALFA_PRODUCT, await photo());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    created.push({ tenant: ALFA, imageId: result.id });
    const path = `${ALFA}/products/${ALFA_PRODUCT}/${result.id}`;

    const beta = await signInAs("ownerBeta");
    await beta.storage.from(BUCKET).remove([imageObjectName(path, 480), imageObjectName(path, 1280)]);
    expect(await deleteProductImage(beta, BETA, result.id)).toEqual({ ok: false, error: "La foto no existe." });

    expect(await status(publicImageUrl(path, 480))).toBe(200);
  });

  it("un visitante anónimo no puede listar el bucket", async () => {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    const { data } = await anon.storage.from(BUCKET).list(`${ALFA}/products/${ALFA_PRODUCT}`);
    expect(data ?? []).toEqual([]);
  });

  it("borrar una foto borra sus archivos", async () => {
    const owner = await signInAs("ownerAlfa");
    const result = await addProductImage(owner, ALFA, ALFA_PRODUCT, await photo());
    if (!result.ok) throw new Error(result.error);
    const path = `${ALFA}/products/${ALFA_PRODUCT}/${result.id}`;

    expect(await deleteProductImage(owner, ALFA, result.id)).toEqual({ ok: true, id: result.id });
    expect(await status(publicImageUrl(path, 480))).not.toBe(200);
    expect(await status(publicImageUrl(path, 1280))).not.toBe(200);
  });

  it("borrar un producto borra los archivos de sus fotos", async () => {
    const owner = await signInAs("ownerAlfa");
    const product = await createProduct(owner, ALFA, {
      name: `Con foto ${Date.now()}`,
      description: null,
      category_id: null,
      price: 1000,
      compare_at_price: null,
      is_published: false,
      is_available: true,
      is_featured: false,
    });
    if (!product.ok) throw new Error(product.error);
    const image = await addProductImage(owner, ALFA, product.id, await photo());
    if (!image.ok) throw new Error(image.error);
    const path = `${ALFA}/products/${product.id}/${image.id}`;
    expect(await status(publicImageUrl(path, 480))).toBe(200);

    expect((await deleteProduct(owner, ALFA, product.id)).ok).toBe(true);
    expect(await status(publicImageUrl(path, 480))).not.toBe(200);
  });

  it("el plan Base corta en 3 fotos por producto y no deja archivos sueltos", async () => {
    const beta = await signInAs("ownerBeta");
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await addProductImage(beta, BETA, BETA_PRODUCT, await photo()));
    // La remera ya tiene 1 foto en el seed: entran 2 más y la tercera se rechaza.
    expect(results.map((r) => r.ok)).toEqual([true, true, false]);
    expect(results[2]).toEqual({ ok: false, error: "El plan Base permite hasta 3 fotos por producto." });

    const images = await listProductImages(beta, BETA, BETA_PRODUCT);
    expect(images).toHaveLength(3);

    // Archivos en la carpeta: los de la foto del seed (los sube scripts/seed-images.mjs)
    // y los de las 2 fotos aceptadas. La rechazada no dejó ningún archivo suelto.
    const SEED_IMAGE = "b3000000-0000-4000-8000-000000000001";
    const { data: objects } = await beta.storage.from(BUCKET).list(`${BETA}/products/${BETA_PRODUCT}`);
    expect(objects?.map((o) => o.name).filter((name) => !name.startsWith(SEED_IMAGE)).sort()).toEqual(
      results.flatMap((r) => (r.ok ? [`${r.id}-1280.webp`, `${r.id}-480.webp`] : [])).sort(),
    );
    for (const r of results) if (r.ok) await deleteProductImage(beta, BETA, r.id);
  });
});
