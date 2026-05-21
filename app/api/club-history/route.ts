// Gemini-powered club history blurb. 5-6 short sentences in French covering
// fondation, époques marquantes, palmarès clés, période récente. Returns a
// minimal fallback when the Gemini key is missing.
//
// Cached 24h server-side — club history doesn't move.

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const revalidate = 86400;

export interface ClubHistory {
  history: string;
  bullets: string[];   // 3-5 chronological highlights
  updatedAt: string;
}

function fallback(name: string, founded?: string): ClubHistory {
  const f = founded ? ` Le club est fondé en ${founded}.` : "";
  return {
    history: `Historique détaillé indisponible pour ${name}.${f} Activez la clé Gemini pour générer un résumé.`,
    bullets: [],
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json(fallback(name, founded));

  const ctx = [
    `Club : ${name}`,
    league && `Compétition actuelle : ${league === "L2" ? "Ligue 2" : "Ligue 1"}`,
    founded && `Fondation : ${founded}`,
    stadium && `Stade : ${stadium}`,
    city && `Ville : ${city}`,
  ].filter(Boolean).join(" | ");

  try {
    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        `Tu es un historien du football français. Rédige un historique court et factuel d'un club, en français.
Le résumé doit faire 5-6 phrases couvrant : fondation, époques marquantes, principaux titres et trophées, descentes/montées importantes, période récente.
Sois précis sur les dates et les chiffres. Évite les superlatifs vides. Aucune invention.
Réponds UNIQUEMENT en JSON: {"history":"<5-6 phrases>","bullets":["<jalon 1>","<jalon 2>","<jalon 3>","<jalon 4>"]}
Les jalons sont 3 à 5 dates clés au format "ANNÉE — événement court" (ex: "1932 — Membre fondateur du championnat professionnel").`,
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
    });
    const result = await model.generateContent(ctx);
    const text = result.response.text();
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    if (!json.history) return NextResponse.json(fallback(name, founded));
    return NextResponse.json({
      history: String(json.history).slice(0, 1400),
      bullets: Array.isArray(json.bullets)
        ? json.bullets.slice(0, 6).map((b: unknown) => String(b).slice(0, 160))
        : [],
      updatedAt: new Date().toISOString(),
    } satisfies ClubHistory);
  } catch (err) {
    console.warn("[/api/club-history] gemini failed:", err);
    return NextResponse.json(fallback(name, founded));
  }
}
