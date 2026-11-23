import { describe, expect, it } from "vitest";
import { addLine, parseCartV1, parseCartV2, setLineQuantity } from "./cart-lines";

const P = "11111111-1111-4111-8111-111111111111";
const Q = "22222222-2222-4222-8222-222222222222";

describe("lectura del carrito guardado", () => {
  it("convierte el carrito viejo (pedido:v1) a líneas sin opciones", () => {
    expect(parseCartV1([{ productId: P, quantity: 2 }, { productId: Q, quantity: 0 }, "basura"])).toEqual([
      { productId: P, optionIds: [], quantity: 2 },
    ]);
  });
  it("lee el carrito nuevo con opciones y descarta lo inválido", () => {
    expect(
      parseCartV2([
        { productId: P, optionIds: ["a", "b"], quantity: 1 },
        { productId: P, optionIds: "no", quantity: 1 },
        { productId: Q, optionIds: [], quantity: 120 },
      ]),
    ).toEqual([{ productId: P, optionIds: ["a", "b"], quantity: 1 }]);
  });
  it("algo que no es una lista queda vacío", () => {
    expect(parseCartV2(null)).toEqual([]);
    expect(parseCartV1({})).toEqual([]);
  });
});

describe("agregar y cambiar cantidades", () => {
  it("la misma combinación (en otro orden) suma en la misma línea", () => {
    const one = addLine([], P, ["b", "a"]);
    const two = addLine(one, P, ["a", "b"]);
    expect(two).toEqual([{ productId: P, optionIds: ["b", "a"], quantity: 2 }]);
  });
  it("otra combinación es otra línea", () => {
    const lines = addLine(addLine([], P, ["a"]), P, ["b"]);
    expect(lines).toHaveLength(2);
  });
  it("cantidad 0 saca la línea; tope de 99", () => {
    const lines = addLine([], P, []);
    expect(setLineQuantity(lines, P, 0)).toEqual([]);
    expect(setLineQuantity(lines, P, 500)[0].quantity).toBe(99);
  });
  it("no pasa de 50 líneas", () => {
    let lines = addLine([], P, []);
    for (let i = 0; i < 60; i++) lines = addLine(lines, P, [`o${i}`]);
    expect(lines).toHaveLength(50);
  });
});
