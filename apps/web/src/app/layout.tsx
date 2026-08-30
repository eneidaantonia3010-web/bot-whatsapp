import type { Metadata } from "next";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n/I18nContext";

import { PwaRegister } from "@/components/PwaRegister";

const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni-moda",
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glow Studio by Sofia | Salón de Belleza Premium en Buenos Aires",
  description:
    "Descubrí una experiencia de belleza única en Buenos Aires. Cortes, coloración, uñas gel, faciales y tratamientos premium. Reservá tu turno online.",
  manifest: "/manifest.json",
  keywords: [
    "salón de belleza",
    "peluquería premium",
    "uñas gel",
    "facial",
    "keratina",
    "Buenos Aires",
    "Glow Studio",
  ],
  openGraph: {
    title: "Glow Studio by Sofia",
    description: "Donde tu belleza brilla ✨ Salón de belleza premium en Buenos Aires",
    type: "website",
    locale: "es_AR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark scroll-smooth">
      <body className={`${bodoniModa.variable} ${hankenGrotesk.variable} antialiased overflow-x-hidden selection:bg-secondary-container selection:text-white`}>
        <I18nProvider>
          <PwaRegister />
          <Navbar />
          <main>{children}</main>
          <Footer />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--color-surface)',
                border: '1px solid var(--color-bg-alt)',
                color: 'var(--color-ink)',
                fontFamily: 'var(--font-sans)',
                boxShadow: 'var(--shadow-soft)',
                borderRadius: 'var(--radius-md)'
              },
            }}
          />
        </I18nProvider>
      </body>
    </html>
  );
}
