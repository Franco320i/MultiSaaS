import { ImageResponse } from "next/og";

// Imagen que se ve al compartir vidri.ar en WhatsApp o redes. Colores de "Noche".
export const alt = "Vidri: catálogos con pedidos a WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "radial-gradient(circle at 80% 20%, rgba(124,58,237,0.45), #0B0912 60%)",
          color: "#F3F0FA",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 72 }}>
          vidri<span style={{ color: "#C4B5FD" }}>.</span>
        </div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 60, lineHeight: 1.15, maxWidth: 960 }}>
          Tu catálogo, con tu marca, en un link.
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: "#C4B5FD", fontFamily: "sans-serif" }}>
          Catálogos con pedidos a WhatsApp · 14 días gratis
        </div>
      </div>
    ),
    size,
  );
}
