import { describe, expect, it, vi } from "vitest";
import type { Storefront } from "@/core/tenancy/storefront";
import { orderRequestSchema, type OrderSummary } from "./schemas";
import { submitOrder, type SubmitDeps } from "./submit";
import { buildOrderMessage, MAX_MESSAGE_LENGTH, whatsappUrl } from "./whatsapp";

const order: OrderSummary = {
  order_id: "9f000000-0000-4000-8000-000000000001",
  number: 128,
  created: true,
  fulfillment: "delivery",
  customer_name: "Lucía",
  delivery_address: "Av. San Martín 123",
  notes: "sin cebolla",
  subtotal: 2450000,
  delivery_fee: 150000,
  total: 2600000,
  items: [
    { product_name: "Hamburguesa doble", quantity: 2, unit_price: 900000, line_total: 1800000, options: [] },
    { product_name: "Papas grandes", quantity: 1, unit_price: 650000, line_total: 650000, options: [] },
  ],
};

describe("buildOrderMessage", () => {
  it("arma el mensaje del diseño", () => {
    expect(buildOrderMessage(order, "Burger Alfa")).toBe(
      [
        "Hola Burger Alfa, quiero hacer este pedido:",
        "Pedido #128",
        "2 x Hamburguesa doble - $ 18.000",
        "1 x Papas grandes - $ 6.500",
        "Subtotal: $ 24.500",
        "Envío: $ 1.500",
        "Total: $ 26.000",
        "Entrega: envío a Av. San Martín 123",
        "Nombre: Lucía",
        "Notas: sin cebolla",
      ].join("\n"),
    );
  });

  it("retiro: sin línea de envío", () => {
    const pickup = { ...order, fulfillment: "pickup" as const, delivery_address: null, delivery_fee: 0, total: 2450000, notes: null };
    const message = buildOrderMessage(pickup, "Burger Alfa");
    expect(message).toContain("Entrega: retiro en el local");
    expect(message).not.toContain("Envío:");
    expect(message).not.toContain("Notas:");
  });

  it("recorta las notas largas para no pasar el límite", () => {
    const message = buildOrderMessage({ ...order, notes: "x".repeat(3000) }, "Burger Alfa");
    expect(message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    expect(message).toMatch(/Notas: x+…$/);
  });

  it("con muchísimas líneas, resume las que no entran", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      product_name: `Producto con un nombre bastante largo número ${i + 1}`,
      quantity: 1,
      unit_price: 100000,
      line_total: 100000,
      options: [],
    }));
    const message = buildOrderMessage({ ...order, items, notes: null }, "Burger Alfa");
    expect(message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    expect(message).toMatch(/… y \d+ productos más/);
    expect(message).toContain("Total: $ 26.000");
  });
});

describe("whatsappUrl", () => {
  it("usa el número sin + y codifica el texto", () => {
    expect(whatsappUrl("+5492954000001", "Hola\n#1")).toBe("https://wa.me/5492954000001?text=Hola%0A%231");
  });
  it("sin número del comercio, no hay link", () => {
    expect(whatsappUrl(null, "Hola")).toBeNull();
  });
});

describe("orderRequestSchema", () => {
  const valid = {
    items: [{ productId: "a2000000-0000-4000-8000-000000000001", quantity: 2 }],
    customerName: " Lucía ",
    customerPhone: "2954 123456",
    fulfillment: "pickup",
    idempotencyKey: "9f000000-0000-4000-8000-000000000002",
    turnstileToken: "token",
  };

  it("acepta un pedido válido y descarta lo que no pidió (precios, comercio)", () => {
    const parsed = orderRequestSchema.parse({ ...valid, total: 1, tenantId: "x", items: [{ ...valid.items[0], price: 1 }] });
    expect(parsed).not.toHaveProperty("total");
    expect(parsed).not.toHaveProperty("tenantId");
    expect(parsed.items[0]).toEqual({ productId: valid.items[0].productId, optionIds: [], quantity: 2 });
    expect(parsed.customerName).toBe("Lucía");
  });
  it("rechaza cantidades fuera de 1 a 99 y más de 50 líneas", () => {
    expect(orderRequestSchema.safeParse({ ...valid, items: [{ ...valid.items[0], quantity: 0 }] }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...valid, items: [{ ...valid.items[0], quantity: 100 }] }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...valid, items: Array(51).fill(valid.items[0]) }).success).toBe(false);
  });
  it("un envío exige dirección", () => {
    const result = orderRequestSchema.safeParse({ ...valid, fulfillment: "delivery" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Escribí la dirección de entrega.");
  });
});

describe("submitOrder", () => {
  const storefront = {
    available: true,
    tenant_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    display_name: "Burger Alfa",
    whatsapp_phone: "+5492954000001",
    currency: "ARS",
    timezone: "America/Argentina/Buenos_Aires",
    open_mode: "open",
    hours: [],
    closed_message: null,
    min_order_amount: 500000,
  } as unknown as Storefront;

  const payload = {
    items: [{ productId: "a2000000-0000-4000-8000-000000000001", quantity: 2 }],
    customerName: "Lucía",
    customerPhone: "2954 123456",
    fulfillment: "delivery",
    deliveryAddress: "Av. San Martín 123",
    idempotencyKey: "9f000000-0000-4000-8000-000000000002",
    turnstileToken: "token",
  };

  const deps = (overrides: Partial<SubmitDeps> = {}): SubmitDeps => ({
    verifyTurnstile: vi.fn(async () => true),
    ipSalt: "sal-de-prueba-larga",
    withinRateLimits: vi.fn(async () => true),
    createOrder: vi.fn(async () => ({ ok: true as const, order })),
    ...overrides,
  });

  it("camino feliz: número y link de WhatsApp armado en el servidor", async () => {
    const d = deps();
    const result = await submitOrder(storefront, payload, "1.2.3.4", d);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ number: 128, created: true });
    expect("whatsappUrl" in result.body && result.body.whatsappUrl).toMatch(/^https:\/\/wa\.me\/5492954000001\?text=Hola%20Burger%20Alfa/);
    // El comercio sale del host (storefront), y la IP nunca viaja en claro.
    expect(d.createOrder).toHaveBeenCalledWith(storefront.tenant_id, expect.anything(), expect.not.stringContaining("1.2.3.4"));
  });

  it("cerrado: no llega a Turnstile ni a la base", async () => {
    const d = deps();
    const closed = { ...storefront, open_mode: "closed", closed_message: "Volvemos el martes" } as Storefront;
    const result = await submitOrder(closed, payload, null, d);
    expect(result).toEqual({ status: 409, body: { error: "Volvemos el martes" } });
    expect(d.verifyTurnstile).not.toHaveBeenCalled();
    expect(d.createOrder).not.toHaveBeenCalled();
  });

  it("Turnstile rechazado", async () => {
    const d = deps({ verifyTurnstile: vi.fn(async () => false) });
    expect((await submitOrder(storefront, payload, null, d)).status).toBe(400);
    expect(d.createOrder).not.toHaveBeenCalled();
  });

  it("límite de frecuencia superado", async () => {
    const d = deps({ withinRateLimits: vi.fn(async () => false) });
    expect((await submitOrder(storefront, payload, null, d)).status).toBe(429);
    expect(d.createOrder).not.toHaveBeenCalled();
  });

  it("productos no disponibles: devuelve cuáles para sacarlos del carrito", async () => {
    const d = deps({
      createOrder: vi.fn(async () => ({ ok: false as const, error: "products_unavailable" as const, unavailable: ["x"] })),
    });
    expect(await submitOrder(storefront, payload, null, d)).toEqual({
      status: 409,
      body: { error: "Algunos productos ya no están disponibles. Los sacamos de tu pedido.", unavailable: ["x"] },
    });
  });

  it("pedido mínimo: mensaje con el monto del comercio", async () => {
    const d = deps({ createOrder: vi.fn(async () => ({ ok: false as const, error: "below_minimum" as const })) });
    expect((await submitOrder(storefront, payload, null, d)).body).toEqual({ error: "El pedido mínimo es $ 5.000." });
  });

  it("error desconocido: mensaje genérico", async () => {
    const d = deps({ createOrder: vi.fn(async () => ({ ok: false as const, error: "unknown" as const })) });
    const result = await submitOrder(storefront, payload, null, d);
    expect(result.status).toBe(500);
    expect(JSON.stringify(result.body)).not.toMatch(/create_order|P0001|tenant/);
  });

  it("cuerpo inválido: 400 sin tocar nada más", async () => {
    const d = deps();
    expect((await submitOrder(storefront, { items: [] }, null, d)).status).toBe(400);
    expect(d.verifyTurnstile).not.toHaveBeenCalled();
  });
});

describe("buildOrderMessage con opciones (parte 3)", () => {
  it("muestra lo elegido entre paréntesis", () => {
    const withOptions: OrderSummary = {
      ...order,
      items: [
        {
          product_name: "Hamburguesa a elección",
          quantity: 1,
          unit_price: 1030000,
          line_total: 1030000,
          options: [
            { group: "Tamaño", name: "Doble", price_delta: 150000 },
            { group: "Extras", name: "Panceta", price_delta: 80000 },
          ],
        },
      ],
    };
    expect(buildOrderMessage(withOptions, "Burger Alfa")).toContain(
      "1 x Hamburguesa a elección (Doble, Panceta) - $ 10.300",
    );
  });
});
