import { describe, expect, it } from "vitest";
import { brandSchema, contactSchema, deliverySchema, hoursFromForm, hoursSchema, normalizeWhatsapp, provisionSchema } from "./schemas";

describe("normalizeWhatsapp", () => {
  it("saca espacios, guiones y paréntesis", () => {
    expect(normalizeWhatsapp("+54 9 (2954) 12-3456")).toBe("+5492954123456");
  });
});

describe("provisionSchema", () => {
  const valid = { name: "Burger del Centro", slug: "burger-centro", businessType: "gastronomia", whatsappPhone: "+54 9 2954 123456" };
  it("acepta un alta válida y normaliza el WhatsApp", () => {
    expect(provisionSchema.parse(valid).whatsappPhone).toBe("+5492954123456");
  });
  it("rechaza WhatsApp sin código de país", () => {
    expect(provisionSchema.safeParse({ ...valid, whatsappPhone: "2954 123456" }).success).toBe(false);
  });
  it("rechaza slugs reservados, cortos o con espacios", () => {
    for (const slug of ["app", "nuevo", "ab", "mi local"]) {
      expect(provisionSchema.safeParse({ ...valid, slug }).success).toBe(false);
    }
  });
  it("pasa el slug a minúsculas", () => {
    expect(provisionSchema.parse({ ...valid, slug: "Burger-Centro" }).slug).toBe("burger-centro");
  });
});

describe("brandSchema y contactSchema", () => {
  it("solo acepta colores de la paleta", () => {
    expect(brandSchema.safeParse({ display_name: "Burger", brand: "#c2410c" }).success).toBe(true);
    expect(brandSchema.safeParse({ display_name: "Burger", brand: "#ff00ff" }).success).toBe(false);
    expect(brandSchema.safeParse({ display_name: "Burger", brand: "red; background:url(x)" }).success).toBe(false);
  });
  it("Instagram sin @ y vacío como null", () => {
    expect(contactSchema.parse({ whatsapp_phone: "+5492954123456", instagram: "@burger.alfa" }).instagram).toBe("burger.alfa");
    expect(contactSchema.parse({ whatsapp_phone: "+5492954123456", instagram: "" }).instagram).toBeNull();
  });
});

describe("deliverySchema", () => {
  it("convierte los montos a centavos y vacío a 0", () => {
    expect(deliverySchema.parse({ accepts_pickup: true, accepts_delivery: true, delivery_fee: "1.500", min_order_amount: "" })).toEqual({
      accepts_pickup: true,
      accepts_delivery: true,
      delivery_fee: 150000,
      min_order_amount: 0,
    });
  });
  it("exige al menos una forma de entrega", () => {
    const result = deliverySchema.safeParse({ accepts_pickup: false, accepts_delivery: false, delivery_fee: "", min_order_amount: "" });
    expect(result.error?.issues[0].message).toBe("Elegí al menos una forma de entrega: retiro o envío.");
  });
  it("monto inválido con mensaje claro", () => {
    const result = deliverySchema.safeParse({ accepts_pickup: true, accepts_delivery: true, delivery_fee: "mucho", min_order_amount: "" });
    expect(result.error?.issues[0].message).toContain("El costo de envío no es válido");
  });
});

describe("horarios", () => {
  it("lee del formulario solo los días abiertos, con uno o dos rangos", () => {
    const form = new FormData();
    form.set("open-1", "on");
    form.set("opens-1-1", "09:00");
    form.set("closes-1-1", "13:00");
    form.set("opens-1-2", "17:00");
    form.set("closes-1-2", "21:00");
    form.set("opens-2-1", "09:00"); // martes sin marcar: cerrado
    form.set("closes-2-1", "13:00");
    form.set("open-0", "on");
    form.set("opens-0-1", "19:00");
    form.set("closes-0-1", "00:30");
    expect(hoursSchema.parse(hoursFromForm(form))).toEqual([
      { weekday: 0, opens_at: "19:00", closes_at: "00:30" },
      { weekday: 1, opens_at: "09:00", closes_at: "13:00" },
      { weekday: 1, opens_at: "17:00", closes_at: "21:00" },
    ]);
  });
  it("rechaza apertura y cierre iguales y horas inválidas", () => {
    expect(hoursSchema.safeParse([{ weekday: 1, opens_at: "09:00", closes_at: "09:00" }]).success).toBe(false);
    expect(hoursSchema.safeParse([{ weekday: 1, opens_at: "25:00", closes_at: "09:00" }]).success).toBe(false);
  });
});

describe("contactSchema: medios de pago y Todos los pedidos incluyen", () => {
  const base = { whatsapp_phone: "+5492954123456", instagram: "" };
  it("acepta medios de la lista y descarta frases vacías", () => {
    const parsed = contactSchema.parse({ ...base, payment_methods: ["efectivo", "mercado_pago"], highlights: ["Funda de regalo", "", "  "] });
    expect(parsed.payment_methods).toEqual(["efectivo", "mercado_pago"]);
    expect(parsed.highlights).toEqual(["Funda de regalo"]);
  });
  it("sin nada tildado queda vacío", () => {
    const parsed = contactSchema.parse(base);
    expect(parsed.payment_methods).toEqual([]);
    expect(parsed.highlights).toEqual([]);
  });
  it("rechaza un medio de pago fuera de la lista", () => {
    expect(contactSchema.safeParse({ ...base, payment_methods: ["cheque"] }).success).toBe(false);
  });
  it("rechaza una frase de más de 60 letras con un mensaje claro", () => {
    const result = contactSchema.safeParse({ ...base, highlights: ["x".repeat(61)] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Cada frase puede tener hasta 60 letras.");
  });
  it("rechaza más de 4 frases", () => {
    expect(contactSchema.safeParse({ ...base, highlights: ["a", "b", "c", "d", "e"] }).success).toBe(false);
  });
});
