import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ImageError, processProductImage } from "./process";

function solid(width: number, height: number, format: "jpeg" | "png" | "webp" = "jpeg") {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 80, b: 40 } } })
    .toFormat(format)
    .toBuffer();
}

describe("processProductImage", () => {
  it("genera WebP de 480 y 1280 px sin agrandar ni deformar", async () => {
    const result = await processProductImage(await solid(2000, 1500));

    const small = await sharp(result.files[480]).metadata();
    const large = await sharp(result.files[1280]).metadata();
    expect(small.format).toBe("webp");
    expect(large.format).toBe("webp");
    expect([small.width, small.height]).toEqual([480, 360]);
    expect([large.width, large.height]).toEqual([1280, 960]);
    expect([result.width, result.height]).toEqual([1280, 960]);
  });

  it("no agranda fotos chicas", async () => {
    const result = await processProductImage(await solid(600, 400, "png"));
    const large = await sharp(result.files[1280]).metadata();
    expect([large.width, large.height]).toEqual([600, 400]);
  });

  it("acepta JPEG, PNG y WebP", async () => {
    for (const format of ["jpeg", "png", "webp"] as const) {
      await expect(processProductImage(await solid(400, 400, format))).resolves.toBeDefined();
    }
  });

  it("corrige la rotación y elimina los metadatos (EXIF, ubicación GPS)", async () => {
    const withExif = await sharp(await solid(1000, 600))
      .withMetadata({ orientation: 6 })
      .withExifMerge({ IFD0: { Make: "Telefono" }, IFD3: { GPSLatitude: "36/1 37/1 0/1" } })
      .jpeg()
      .toBuffer();
    const input = await sharp(withExif).metadata();
    expect(input.orientation).toBe(6);
    expect(input.exif?.length).toBeGreaterThan(0);

    const result = await processProductImage(withExif);
    const meta = await sharp(result.files[1280]).metadata();

    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    // Orientación 6 = girada 90°: la foto vertical queda vertical.
    expect([meta.width, meta.height]).toEqual([600, 1000]);
  });

  it("rechaza un SVG aunque diga ser una imagen (puede contener scripts)", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><script>alert(1)</script><rect width="500" height="500"/></svg>',
    );
    await expect(processProductImage(svg)).rejects.toThrow(ImageError);
    await expect(processProductImage(svg)).rejects.toThrow(/Formato no admitido|no es una imagen/);
  });

  it("rechaza archivos que no son imágenes aunque tengan nombre de foto", async () => {
    await expect(processProductImage(Buffer.from("esto no es una foto.jpg"))).rejects.toThrow(/no es una imagen válida/);
    await expect(processProductImage(Buffer.alloc(0))).rejects.toThrow(/vacío/);
  });

  it("rechaza GIF y animaciones", async () => {
    const gif = await sharp({ create: { width: 400, height: 400, channels: 3, background: "blue" } }).gif().toBuffer();
    await expect(processProductImage(gif)).rejects.toThrow(/Formato no admitido/);
  });

  it("rechaza fotos demasiado chicas", async () => {
    await expect(processProductImage(await solid(150, 900))).rejects.toThrow(/muy chica/);
  });

  it("rechaza imágenes gigantes (más de 40 megapíxeles)", async () => {
    const huge = await solid(8000, 6000, "png");
    await expect(processProductImage(huge)).rejects.toThrow(ImageError);
  }, 30_000);

  it("rechaza archivos de más de 4 MB", async () => {
    await expect(processProductImage(Buffer.alloc(4 * 1024 * 1024 + 1, 1))).rejects.toThrow(/pesa demasiado/);
  });
});
