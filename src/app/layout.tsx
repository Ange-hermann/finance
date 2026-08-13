import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { Toaster } from "sonner";
import SplashScreen from "@/components/SplashScreen";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CTF Finance — Gestion Financière",
  description: "Plateforme de gestion financière CTF — offrandes, dîmes, dons et répartition automatique",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${playfair.variable} ${inter.variable} antialiased bg-noir text-blanc min-h-screen`}
      >
        <SplashScreen />
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#141414",
              border: "1px solid rgba(201, 162, 39, 0.3)",
              color: "#FAFAF9",
            },
          }}
        />
      </body>
    </html>
  );
}
