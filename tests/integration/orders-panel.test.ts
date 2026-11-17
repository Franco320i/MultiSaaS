import { describe, expect, it } from "vitest";
import { setOrderStatus } from "@/modules/orders/mutations";
import { getOrder, listOrders } from "@/modules/orders/queries";
import { SEED, signInAs } from "./helpers";

/**
 * Pantalla de pedidos del panel con sesiones reales (RLS actúa). Usa los pedidos del seed:
 * Alfa #1 (nuevo) y #2 (confirmado), Beta #1 (nuevo). Cada prueba deja los estados
 * como estaban cuando puede; `npm run db:reset` los restaura del todo.
 */

const ALFA = SEED.tenants.alfa;
const BETA = SEED.tenants.beta;

async function alfaOrder(number: number) {
  const owner = await signInAs("ownerAlfa");
  const orders = await listOrders(owner, ALFA, "open");
  const order = orders.find((o) => o.number === number);
  if (!order) throw new Error(`No está el pedido #${number} de Alfa en curso. ¿Corriste npm run db:reset?`);
  return order;
}

describe("pedidos en el panel (sesiones reales)", () => {
  it("el dueño ve los pedidos en curso de su comercio, con el detalle completo", async () => {
    const owner = await signInAs("ownerAlfa");
    const open = await listOrders(owner, ALFA, "open");
    expect(open.map((o) => o.number)).toEqual(expect.arrayContaining([1, 2]));

    const first = open.find((o) => o.number === 1)!;
    const detail = await getOrder(owner, ALFA, first.id);
    expect(detail).toMatchObject({ number: 1, customerName: "Lucía Pérez", fulfillment: "delivery", total: 2600000 });
    expect(detail?.items.map((i) => `${i.quantity} ${i.productName}`)).toEqual(["2 Hamburguesa doble", "1 Hamburguesa simple"]);
  });

  it("la dueña de Beta no ve ni puede cambiar pedidos de Alfa, aunque el código pasara el comercio de Alfa", async () => {
    const order = await alfaOrder(1);
    const beta = await signInAs("ownerBeta");
    expect(await getOrder(beta, ALFA, order.id)).toBeNull();
    expect(await listOrders(beta, ALFA, "open")).toEqual([]);
    expect(await setOrderStatus(beta, ALFA, order.id, "cancelled")).toEqual({ ok: false, error: "El pedido no existe." });
    expect(await setOrderStatus(beta, BETA, order.id, "cancelled")).toEqual({ ok: false, error: "El pedido no existe." });
  });

  it("un usuario sin comercio no ve pedidos", async () => {
    const outsider = await signInAs("outsider");
    expect(await listOrders(outsider, ALFA, "open")).toEqual([]);
  });

  it("el staff avanza un pedido; volver atrás da un mensaje claro", async () => {
    const order = await alfaOrder(2); // confirmado
    const staff = await signInAs("staffAlfa");
    expect(await setOrderStatus(staff, ALFA, order.id, "preparing")).toEqual({ ok: true });
    expect(await setOrderStatus(staff, ALFA, order.id, "confirmed")).toEqual({
      ok: false,
      error: "El pedido ya avanzó. Recargá para ver su estado.",
    });
    const detail = await getOrder(staff, ALFA, order.id);
    expect(detail?.status).toBe("preparing");
  });
});
