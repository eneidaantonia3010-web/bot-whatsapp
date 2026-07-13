import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "sonner";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glow Studio by Sofia | Salón de Belleza Premium en Buenos Aires",
  description:
    "Descubrí una experiencia de belleza única en Buenos Aires. Cortes, coloración, uñas gel, faciales y tratamientos premium. Reservá tu turno online.",
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
    <html lang="es" className="scroll-smooth">
      <body className={`${outfit.variable} ${inter.variable} font-sans bg-[var(--color-bg)] text-[var(--color-ink)] antialiased`}>
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
      </body>
    </html>
  );
}
