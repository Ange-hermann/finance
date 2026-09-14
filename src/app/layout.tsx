import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import SplashScreen from "@/components/SplashScreen";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const aeonik = {
  style: {
    fontFamily: 'Aeonik, sans-serif',
  },
  className: 'font-aeonik',
};

export const metadata: Metadata = {
  title: "CTF Finance — Gestion Financière",
  description: "Plateforme de gestion financière CTF — offrandes, dîmes, dons et répartition automatique",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CTF Finance",
  },
  icons: {
    icon: [{ url: "/Logo.png", type: "image/png" }],
    apple: [{ url: "/Logo.png", type: "image/png" }],
    shortcut: ["/Logo.png"],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#C9A227",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/Logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CTF Finance" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.cdnfonts.com/css/aeonik" rel="stylesheet" />
      </head>
      <body
        className="antialiased bg-noir text-blanc min-h-screen font-aeonik"
      >
        <ServiceWorkerRegister />
        <SplashScreen />
        {children}
        <PWAInstallPrompt />
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
