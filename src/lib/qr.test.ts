import { describe, expect, it } from "vitest";
import { qrPngDataUri } from "./qr";

describe("qrPngDataUri", () => {
  it("devuelve un PNG para descargar e imprimir", async () => {
    const uri = await qrPngDataUri("https://alfa.vidri.ar");
    expect(uri.startsWith("data:image/png;base64,")).toBe(true);
    // Firma de un archivo PNG.
    const bytes = Buffer.from(uri.split(",")[1], "base64");
    expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
