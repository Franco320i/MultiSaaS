import { afterAll, describe, expect, it } from "vitest";
import type { Storefront } from "@/core/tenancy/storefront";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createOrder, submitOrder, withinRateLimits } from "@/modules/orders/server";
import { SEED, signInAs } from "./helpers";

/**
 * Pedidos de punta a punta en el servidor (sin Next): submitOrder con la base real,
 * la clave secreta local y Turnstile simulado. Diseño, secciones 11 y 13.
 */

const DOBLE = "a2000000-0000-4000-8000-000000000001";
const SIMPLE = "a2000000-0000-4000-8000-000000000002";
const GASEOSA = "a2000000-0000-4000-8000-000000000003"; // sin stock
const REMERA_BETA = "b2000000-0000-4000-8000-000000000001";

// Lo mismo que devolvería getStorefront("alfa.localhost"), abierto para la prueba.
const alfa = {
  available: true,
  tenant_id: SEED.tenants.alfa,
  slug: "alfa",
  display_name: "Burger Alfa",
  whatsapp_phone: "+5492954000001",
  currency: "ARS",
  timezone: "America/Argentina/Buenos_Aires",
  open_mode: "open",
  hours: [],
  closed_message: null,
  min_order_amount: 500000,
  accepts_pickup: true,
  accepts_delivery: true,
  delivery_fee: 150000,
} as unknown as Storefront;

const run = Date.now();
const keys: string[] = [];
let ipCounter = 0;

const deps = { verifyTurnstile: async () => true, ipSalt: "sal-de-prueba-integracion", withinRateLimits, createOrder };

function payload(items: { productId: string; quantity: number }[], extra: Record<string, unknown> = {}) {
  const idempotencyKey = crypto.randomUUID();
  keys.push(idempotencyKey);
  return {
    items,
    customerName: "Prueba Integración",
    customerPhone: "2954 999999",
    fulfillment: "pickup",
    idempotencyKey,
    turnstileToken: "token-simulado",
    ...extra,
  };
}

/** Una IP distinta por prueba, para que los límites de una no afecten a otra. */
const freshIp = () => `10.${run % 250}.${Math.floor(run / 250) % 250}.${++ipCounter}`;

afterAll(async () => {
  const service = createSupabaseServiceClient();
  await service.from("orders").delete().in("idempotency_key", keys);
});

describe("pedidos (base real, clave secreta local, Turnstile simulado)", () => {
  it("crea el pedido con precios de la base y arma el link de WhatsApp", async () => {
    const result = await submitOrder(
      alfa,
      payload([
        { productId: DOBLE, quantity: 1 },
        { productId: SIMPLE, quantity: 1 },
      ]),
      freshIp(),
      deps,
    );
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body.number).toBeGreaterThan(2);
    const text = decodeURIComponent(result.body.whatsappUrl!.split("?text=")[1]);
    expect(text).toContain(`Pedido #${result.body.number}`);
    expect(text).toContain("1 x Hamburguesa doble - $ 9.000");
    expect(text).toContain("Total: $ 15.500");
    expect(text).toContain("Entrega: retiro en el local");
  });

  it("el dueño ve el pedido en su comercio; la dueña de Beta no", async () => {
    const p = payload([{ productId: DOBLE, quantity: 1 }]);
    const result = await submitOrder(alfa, p, freshIp(), deps);
    expect(result.status).toBe(200);

    const owner = await signInAs("ownerAlfa");
    const { data: mine } = await owner.from("orders").select("id").eq("idempotency_key", p.idempotencyKey);
    expect(mine).toHaveLength(1);

    const other = await signInAs("ownerBeta");
    const { data: theirs } = await other.from("orders").select("id").eq("idempotency_key", p.idempotencyKey);
    expect(theirs).toHaveLength(0);
  });

  it("reintentar con la misma clave no duplica el pedido", async () => {
    const ip = freshIp();
    const p = payload([{ productId: DOBLE, quantity: 1 }]);
    const first = await submitOrder(alfa, p, ip, deps);
    const second = await submitOrder(alfa, p, ip, deps);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    if (first.status !== 200 || second.status !== 200) return;
    expect(second.body.number).toBe(first.body.number);
    expect(second.body.created).toBe(false);
  });

  it("un producto sin stock o de otro comercio se rechaza y vuelve en la lista para sacarlo", async () => {
    const result = await submitOrder(
      alfa,
      payload([
        { productId: DOBLE, quantity: 1 },
        { productId: GASEOSA, quantity: 1 },
        { productId: REMERA_BETA, quantity: 1 },
      ]),
      freshIp(),
      deps,
    );
    expect(result.status).toBe(409);
    expect("unavailable" in result.body && [...result.body.unavailable!].sort()).toEqual([GASEOSA, REMERA_BETA].sort());
  });

  it("aunque el cuerpo diga otro comercio, el pedido queda en el del host", async () => {
    const p = payload([{ productId: DOBLE, quantity: 1 }], { tenantId: SEED.tenants.beta, tenant_id: SEED.tenants.beta });
    expect((await submitOrder(alfa, p, freshIp(), deps)).status).toBe(200);
    const service = createSupabaseServiceClient();
    const { data } = await service.from("orders").select("tenant_id").eq("idempotency_key", p.idempotencyKey).single();
    expect(data?.tenant_id).toBe(SEED.tenants.alfa);
  });

  it("el pedido mínimo se controla en la base", async () => {
    // Una simple sola ($ 6.500) supera el mínimo de $ 5.000; con mínimo más alto, no.
    const strict = { ...alfa, min_order_amount: 5000000 } as Storefront;
    const service = createSupabaseServiceClient();
    await service.from("tenant_settings").update({ min_order_amount: 5000000 }).eq("tenant_id", SEED.tenants.alfa);
    try {
      const result = await submitOrder(strict, payload([{ productId: SIMPLE, quantity: 1 }]), freshIp(), deps);
      expect(result).toEqual({ status: 409, body: { error: "El pedido mínimo es $ 50.000." } });
    } finally {
      await service.from("tenant_settings").update({ min_order_amount: 500000 }).eq("tenant_id", SEED.tenants.alfa);
    }
  });

  it("más de 5 pedidos en 10 minutos desde la misma IP: el 6.º se frena", async () => {
    const ip = freshIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await submitOrder(alfa, payload([{ productId: DOBLE, quantity: 1 }]), ip, deps)).status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("con la clave publicable no se puede crear un pedido salteando el servidor", async () => {
    const anon = await signInAs("outsider");
    const { error } = await anon.rpc("create_order", {
      p_tenant_id: SEED.tenants.alfa,
      p_order: { items: [{ product_id: DOBLE, quantity: 1 }] },
    });
    expect(error?.code).toBe("42501");
  });
});
