import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RastreadorDeNavegacao } from "@/components/layout/link-voltar";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Achados e Perdidos FIAP",
    template: "%s · Achados e Perdidos FIAP",
  },
  description: "Consulte itens encontrados no campus e registre retiradas.",
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning só nestes dois: extensões do navegador (gerenciadores de senha, corretores)
    // costumam acrescentar atributos em <html>/<body> antes de o React carregar
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
        <RastreadorDeNavegacao />
      </body>
    </html>
  );
}
