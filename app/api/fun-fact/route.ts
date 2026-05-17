import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Faits de repli affichés avant l'import des données historiques
const FALLBACK_FACTS = [
  "PSG a remporté 11 titres de Ligue 1 depuis 2013, dont 8 consécutifs entre 2013 et 2020 !",
  "L'Olympique de Marseille est le seul club français à avoir remporté la Ligue des Champions (1993).",
  "Monaco a failli battre le record absolu de points en L1 avec 95 pts en 2016-17 — et a quand même perdu le titre !",
  "Kylian Mbappé est devenu le 2e plus jeune buteur de L1 à 16 ans et 257 jours (Monaco, 2015).",
  "Le record de buts en une saison de Ligue 1 appartient à Josip Skoblar : 44 buts avec l'OM en 1970-71.",
  "Le PSG détient le record de victoire en L1 moderne : 9-0 contre Gueugnon en janvier 2016.",
  "L'OM a battu le record d'affluence de L1 avec 67 394 spectateurs au Vélodrome en 2017.",
  "Le titre de Ligue 1 a été remporté par 7 clubs différents depuis 1990.",
  "Zlatan Ibrahimović a inscrit 38 buts en une seule saison de Ligue 1 avec le PSG (2012-13).",
  "Nice a terminé 2e de Ligue 1 en 2016-17 sous Lucien Favre — le meilleur classement du club depuis 1960.",
  "Lille a créé la surprise en remportant le titre de L1 2020-21 devant le PSG, avec seulement 82 pts.",
  "Monaco avait formé une équipe légendaire en 2003-04 avec Henry, Trezeguet et Giuly — vice-champions d'Europe.",
  "Auxerre a été champion de France en 1996 sous Guy Roux, après 44 ans sans titre national.",
  "Rennes a remporté sa première Coupe de France en 2019, brisant une disette de 48 ans.",
  "Lens est revenu en Ligue 1 en 2020-21 et a terminé 2e dès sa première saison de retour.",
];

export async function GET() {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection("funFacts").doc("all").get();
    if (doc.exists) {
      const facts: string[] = doc.data()?.facts ?? [];
      if (facts.length > 0) {
        const fact = facts[Math.floor(Math.random() * facts.length)];
        return NextResponse.json({ fact, source: "db" }, {
          headers: { "Cache-Control": "no-store" },
        });
      }
    }
  } catch { /* fall through */ }

  const fact = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
  return NextResponse.json({ fact, source: "fallback" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
