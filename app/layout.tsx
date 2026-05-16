import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import IconProvider from "./components/IconProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ligue 1 — Classement en direct",
  description: "Classement officiel de la Ligue 1 en temps réel",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body className="min-h-full" style={{ background: "#080c14" }}>
        <IconProvider>{children}</IconProvider>
      </body>
    </html>
  );
}
