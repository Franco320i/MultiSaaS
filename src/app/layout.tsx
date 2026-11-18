import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono, Young_Serif } from "next/font/google";
import "./globals.css";

// Sistema visual "Sobremesa" (docs/design/sistema-visual.md).
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  subsets: ["latin"],
  weight: "400",
});

// Números del panel central (montos, contadores, slugs).
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Catálogos digitales",
  description: "Catálogos con pedidos por WhatsApp para comercios.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${hanken.variable} ${youngSerif.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
