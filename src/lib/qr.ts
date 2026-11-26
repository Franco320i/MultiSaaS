import "server-only";
import QRCode from "qrcode";

/** Código QR de una URL como data URI SVG (se muestra con <img>, sin insertar HTML). */
export async function qrDataUri(url: string): Promise<string> {
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** El mismo QR en PNG de 1024 px, para descargarlo e imprimirlo (cualquier celular lo abre). */
export async function qrPngDataUri(url: string): Promise<string> {
  return QRCode.toDataURL(url, { type: "image/png", width: 1024, margin: 2, errorCorrectionLevel: "M" });
}
