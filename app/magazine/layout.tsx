// Magazine route layout — applies the papier-journal background, the
// editorial font stack (Playfair Display for display, Lora for body,
// Inter for the small-caps labels), and a narrower max-width than the
// main SPA so column measures sit closer to a real publication.
//
// We override the root <body> background via inline style so the rest of
// the SPA's dark theme stays intact when the user navigates back. Note:
// the html.light-mode / html.edito CSS-filter themes from globals.css
// still apply if the user toggled them — which is intentional, the
// magazine reads even better in édito mode.

import type { Metadata } from "next";
import { Playfair_Display, Lora, Inter } from "next/font/google";
import "./magazine.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700", "900"],
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  style: ["normal", "italic"],
});

const interSmall = Inter({
  subsets: ["latin"],
  variable: "--font-inter-mag",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Foot Magazine — Le quotidien du foot lu",
  description:
    "L'édition magazine de Foot Predictom. Hero, dossier, pronos, agenda TV — tous les jours, depuis le 1er janvier 2026.",
};

export default function MagazineLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${playfair.variable} ${lora.variable} ${interSmall.variable} magazine-root`}
      data-keep-color
    >
      {children}
    </div>
  );
}
