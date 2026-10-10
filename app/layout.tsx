import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import IconProvider from "./components/IconProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Foot-Palama — Classement en direct",
  description: "Classement officiel de la Ligue 1 en temps réel",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Foot-Palama", statusBarStyle: "black-translucent" },
};

export const viewport = { themeColor: "#0e7490" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body className="min-h-full" style={{ background: "#080c14" }}>
        <IconProvider>{children}</IconProvider>
      </body>
    </html>
  );
}
