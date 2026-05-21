// Gemini-powered pre-match commentary. 2-3 sentences in French, factual and
// rooted in the stats we pass in. Always returns something usable: when the
// Gemini key is missing or the call fails, we fall back to a deterministic
// template assembled from the same parameters.
//
// Cached 1h server-side — match metadata changes slowly and the commentary
// stays relevant up to kickoff.

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const revalidate = 3600;

export interface MatchPreview {
  preview: string;
  pick: "home" | "draw" | "away";
  confidence: "low" | "medium" | "high";
  updatedAt: string;
}

interface Params {
  home: string; away: string;
  homePos?: string; awayPos?: string;
  homePts?: string; awayPts?: string;
  homeForm?: string; awayForm?: string;
  homeGF?: string; homeGA?: string;
  awayGF?: string; awayGA?: string;
  context?: string;   // e.g. "Ligue 1 · J28" or "Coupe du Monde · Phase de poules · Groupe D"
}

function parseParams(sp: URLSearchParams): Params {
  return {
    home:     sp.get("home")     ?? "Domicile",
    away:     sp.get("away")     ?? "Extérieur",
    homePos:  sp.get("homePos")  ?? undefined,
    awayPos:  sp.get("awayPos")  ?? undefined,
    homePts:  sp.get("homePts")  ?? undefined,
    awayPts:  sp.get("awayPts")  ?? undefined,
    homeForm: sp.get("homeForm") ?? undefined,
    awayForm: sp.get("awayForm") ?? undefined,
    homeGF:   sp.get("homeGF")   ?? undefined,
    homeGA:   sp.get("homeGA")   ?? undefined,
    awayGF:   sp.get("awayGF")   ?? undefined,
    awayGA:   sp.get("awayGA")   ?? undefined,
    context:  sp.get("context")  ?? undefined,
  };
}

// ── Deterministic fallback ────────────────────────────────────────────────────

function fallback(p: Params): MatchPreview {
  const hp = parseInt(p.homePos ?? "0"), ap = parseInt(p.awayPos ?? "0");
  const hpts = parseInt(p.homePts ?? "0"), apts = parseInt(p.awayPts ?? "0");
  const ptDiff = hpts - apts;

  // Naive pick — home advantage tilts ties, big point gap decides
  let pick: "home" | "draw" | "away" = "draw";
  if (ptDiff > 6) pick = "home";
  else if (ptDiff < -6) pick = "away";
  else if (hp > 0 && ap > 0) {
    if (hp + 3 < ap) pick = "home";
    else if (ap + 3 < hp) pick = "away";
    else pick = "home"; // home advantage tiebreaker
  }

  const confidence: MatchPreview["confidence"] =
    Math.abs(ptDiff) > 12 ? "high" : Math.abs(ptDiff) > 5 ? "medium" : "low";

  const ctx = p.context ? ` (${p.context})` : "";
  const posSentence = (hp && ap)
    ? `${p.home} (${hp}e) reçoit ${p.away} (${ap}e)${ctx}.`
    : `${p.home} reçoit ${p.away}${ctx}.`;
  const ptsSentence = (p.homePts && p.awayPts)
    ? ` Au classement, ${p.home} totalise ${hpts} pts contre ${apts} pour ${p.away}.`
    : "";
  const pickSentence = pick === "draw"
    ? " Affiche équilibrée sur le papier — un match nul est plausible."
    : ` ${pick === "home" ? p.home : p.away} part avec l'avantage statistique mais l'écart reste à concrétiser sur le terrain.`;

  return {
    preview: posSentence + ptsSentence + pickSentence,
    pick, confidence,
    updatedAt: new Date().toISOString(),
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const p = parseParams(sp);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json(fallback(p));

  const lines = [
    `Match: ${p.home} vs ${p.away}${p.context ? ` (${p.context})` : ""}`,
    p.homePos && p.awayPos && `Classement: ${p.home} ${p.homePos}e · ${p.away} ${p.awayPos}e`,
    p.homePts && p.awayPts && `Points: ${p.home} ${p.homePts} · ${p.away} ${p.awayPts}`,
    p.homeGF && p.homeGA && `Buts ${p.home}: ${p.homeGF}/${p.homeGA}`,
    p.awayGF && p.awayGA && `Buts ${p.away}: ${p.awayGF}/${p.awayGA}`,
    p.homeForm && `Forme ${p.home}: ${p.homeForm}`,
    p.awayForm && `Forme ${p.away}: ${p.awayForm}`,
  ].filter(Boolean).join(" | ");

  try {
    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        `Tu es un commentateur foot français expert. Rédige un commentaire pré-match factuel en 2-3 phrases en français.
Appuie-toi sur les données fournies (classement, points, forme, buts). Identifie l'enjeu et un pronostic argumenté.
Sois concret, évite le creux. Réponds UNIQUEMENT en JSON: {"preview":"...","pick":"home|draw|away","confidence":"low|medium|high"}`,
    });
    const result = await model.generateContent(lines);
    const text = result.response.text();
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    if (!json.preview) return NextResponse.json(fallback(p));
    return NextResponse.json({
      preview: String(json.preview).slice(0, 600),
      pick: json.pick === "home" || json.pick === "away" ? json.pick : "draw",
      confidence: json.confidence === "high" || json.confidence === "medium" ? json.confidence : "low",
      updatedAt: new Date().toISOString(),
    } satisfies MatchPreview);
  } catch {
    return NextResponse.json(fallback(p));
  }
}
