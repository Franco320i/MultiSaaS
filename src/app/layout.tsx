import type { Metadata } from "next";
import { Hanken_Grotesk, Young_Serif } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Catálogos digitales",
  description: "Catálogos con pedidos por WhatsApp para comercios.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${hanken.variable} ${youngSerif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
