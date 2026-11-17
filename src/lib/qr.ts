import "server-only";
import QRCode from "qrcode";

/** Código QR de una URL como data URI SVG (se muestra con <img>, sin insertar HTML). */
export async function qrDataUri(url: string): Promise<string> {
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
