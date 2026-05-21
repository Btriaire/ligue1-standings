import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import IconProvider from "./components/IconProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MealFlow — Tracker repas et macros",
  description: "Suivi des repas, calories, macros, eau et activite physique",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body className="min-h-full" style={{ background: "#0b0f12" }}>
        <IconProvider>{children}</IconProvider>
      </body>
    </html>
  );
}
