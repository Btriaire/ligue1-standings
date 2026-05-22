// Gemini-powered club history blurb. 5-6 short sentences in French covering
// fondation, époques marquantes, palmarès clés, période récente. Returns a
// minimal fallback when the Gemini key is missing.
//
// Cached 24h server-side — club history doesn't move.

import { NextResponse } from "next/server";
import { callGeminiJSON } from "@/app/lib/gemini";

export const revalidate = 86400;

export interface ClubHistory {
  history: string;
  bullets: string[];   // 3-5 chronological highlights
  updatedAt: string;
}

// Deterministic fallback assembled from the data we already have on hand
// (name / founded / league / stadium / city). Used when Gemini is unreachable
// — the user shouldn't see infra messages.
function fallback(name: string, founded?: string, league?: string, stadium?: string, city?: string): ClubHistory {
  const lg = league === "L2" ? "Ligue 2" : league === "L1" ? "Ligue 1" : null;
  const parts: string[] = [];
  if (founded && city) parts.push(`${name} est un club de football français fondé en ${founded} à ${city}.`);
  else if (founded)    parts.push(`${name} est un club de football français fondé en ${founded}.`);
  else if (city)       parts.push(`${name} est un club de football français basé à ${city}.`);
  else                 parts.push(`${name} est un club de football français.`);
  if (stadium)         parts.push(`Il évolue au ${stadium}.`);
  if (lg)              parts.push(`Le club dispute actuellement la ${lg}.`);
  parts.push("Pour un historique complet, consultez la fiche Wikipédia ou le site officiel du club.");
  const bullets: string[] = [];
  if (founded) bullets.push(`${founded} — Fondation du club`);
  if (stadium) bullets.push(`Stade — ${stadium}`);
  if (lg)      bullets.push(`Saison en cours — ${lg}`);
  return {
    history: parts.join(" "),
    bullets,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const name = sp.get("name") ?? "";
  const founded = sp.get("founded") ?? undefined;
  const league = sp.get("league") ?? undefined;     // "L1" | "L2"
  const stadium = sp.get("stadium") ?? undefined;
  const city = sp.get("city") ?? undefined;

  if (!name) {
    return NextResponse.json({ error: "Missing 'name' query param" }, { status: 400 });
  }

  const ctx = [
    `Club : ${name}`,
    league && `Compétition actuelle : ${league === "L2" ? "Ligue 2" : "Ligue 1"}`,
    founded && `Fondation : ${founded}`,
    stadium && `Stade : ${stadium}`,
    city && `Ville : ${city}`,
  ].filter(Boolean).join(" | ");

  const json = await callGeminiJSON<{ history?: string; bullets?: unknown[] }>({
    label: "club-history",
    temperature: 0.4,
    systemInstruction:
      `Tu es un historien du football français. Rédige un historique court et factuel d'un club, en français.
Le résumé doit faire 5-6 phrases couvrant : fondation, époques marquantes, principaux titres et trophées, descentes/montées importantes, période récente.
Sois précis sur les dates et les chiffres. Évite les superlatifs vides. Aucune invention.
Réponds UNIQUEMENT en JSON: {"history":"<5-6 phrases>","bullets":["<jalon 1>","<jalon 2>","<jalon 3>","<jalon 4>"]}
Les jalons sont 3 à 5 dates clés au format "ANNÉE — événement court" (ex: "1932 — Membre fondateur du championnat professionnel").`,
    prompt: ctx,
  });

  if (!json?.history) return NextResponse.json(fallback(name, founded, league, stadium, city));

  return NextResponse.json({
    history: String(json.history).slice(0, 1400),
    bullets: Array.isArray(json.bullets)
      ? json.bullets.slice(0, 6).map((b) => String(b).slice(0, 160))
      : [],
    updatedAt: new Date().toISOString(),
  } satisfies ClubHistory);
}
