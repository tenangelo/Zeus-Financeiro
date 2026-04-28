import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Zeus Financeiro",
    template: "%s | Zeus Financeiro",
  },
  description: "Agente Financeiro de IA para Restaurantes — Controle CMV, DRE, estoque e fluxo de caixa em um só lugar.",
  keywords: ["gestão financeira", "restaurante", "CMV", "DRE", "fluxo de caixa", "ficha técnica"],
  robots: "noindex, nofollow", // SaaS privado — não indexar
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: "var(--font-inter), system-ui, sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
