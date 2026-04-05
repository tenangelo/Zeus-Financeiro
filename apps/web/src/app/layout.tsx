import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zeus Financeiro",
  description: "Agente Financeiro de IA para Restaurantes",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
