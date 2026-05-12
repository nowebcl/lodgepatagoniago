import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lodge Patagonia Go | Reservas en Tiempo Real",
  description: "Reserva tu cabaña en el corazón de la Patagonia. Experiencia premium, agendamiento inmediato y confort exclusivo.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  themeColor: "#0A0D0A",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lodge Patagonia",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
