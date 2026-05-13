import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const revalidate = 7200; // 2h cache

export interface ClubAnalysis {
  analysis: string;
  tag: "excellent" | "good" | "average" | "difficult" | "crisis";
  updatedAt: string;
}

function fallbackAnalysis(params: URLSearchParams): ClubAnalysis {
  const club    = params.get("club") ?? "Ce club";
  const pos     = parseInt(params.get("pos") ?? "10");
  const pts     = parseInt(params.get("pts") ?? "0");
  const gf      = parseInt(params.get("gf") ?? "0");
  const ga      = parseInt(params.get("ga") ?? "0");
  const form    = params.get("form") ?? "";  // e.g. "4V1D"
  const coach   = params.get("coach") ?? "";
  const injured = parseInt(params.get("injured") ?? "0");
  const recent  = params.get("recent") ?? "";

  const gd = gf - ga;
  const wins  = parseInt(form.match(/(\d+)V/)?.[1] ?? "0");
  const draws = parseInt(form.match(/(\d+)N/)?.[1] ?? "0");
  const losses = parseInt(form.match(/(\d+)D/)?.[1] ?? "0");
  const played = wins + draws + losses || 1;

  // Determine tag
  let tag: ClubAnalysis["tag"] =
    pos <= 2 ? "excellent" :
    pos <= 5 ? "good" :
    pos <= 12 ? "average" :
    pos <= 15 ? "difficult" : "crisis";

  // Position sentence
  const posLabel =
    pos === 1 ? "leader incontesté" :
    pos <= 3 ? `${pos}e, en course pour le podium` :
    pos <= 5 ? `${pos}e, dans la course européenne` :
    pos <= 10 ? `${pos}e au classement` :
    pos <= 15 ? `${pos}e, en milieu de tableau` :
    `${pos}e, en zone dangereuse`;

  const formPct = played > 0 ? Math.round(((wins * 3 + draws) / (played * 3)) * 100) : 0;
  const formLabel =
    formPct >= 75 ? "excellente" :
    formPct >= 55 ? "solide" :
    formPct >= 40 ? "irrégulière" : "en difficulté";

  let s = `${club} est actuellement ${posLabel} avec ${pts} points.`;

  if (played > 0) {
    s += ` Leur forme récente est ${formLabel} (${wins}V ${draws}N ${losses}D), avec ${gf > ga ? `une attaque efficace (${gf} buts) et` : ""}  un différentiel de buts de ${gd > 0 ? "+" : ""}${gd}.`;
  }

  const extras: string[] = [];
  if (injured >= 4) extras.push(`${injured} blessés pèsent sur le groupe`);
  if (coach) extras.push(`sous la direction de ${coach}`);
  if (recent) extras.push(`résultats récents : ${recent.split(",").slice(0, 3).join(", ")}`);

  if (extras.length > 0) s += ` ${extras[0].charAt(0).toUpperCase() + extras[0].slice(1)}.`;

  return { analysis: s, tag, updatedAt: new Date().toISOString() };
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;

  const club    = p.get("club") ?? "Club inconnu";
  const pos     = p.get("pos") ?? "?";
  const pts     = p.get("pts") ?? "?";
  const form    = p.get("form") ?? "";
  const gf      = p.get("gf") ?? "?";
  const ga      = p.get("ga") ?? "?";
  const coach   = p.get("coach") ?? "";
  const injured = p.get("injured") ?? "0";
  const value   = p.get("value") ?? "";
  const recent  = p.get("recent") ?? "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json(fallbackAnalysis(p));

  const data = [
    `${club}|L1 pos${pos}/18|${pts}pts`,
    form && `forme:${form}`,
    `bp${gf}-bc${ga}`,
    coach && `coach:${coach}`,
    injured !== "0" && `blessés:${injured}`,
    value && `val:${value}M€`,
    recent && `récents:${recent}`,
  ].filter(Boolean).join("|");

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 180,
      system: 'Analyste Ligue 1. 2-3 phrases pro en français. JSON uniquement: {"analysis":"...","tag":"excellent|good|average|difficult|crisis"}',
      messages: [{ role: "user", content: data }],
    });

    const text = (msg.content[0] as { text: string }).text;
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    if (!json.analysis) return NextResponse.json(fallbackAnalysis(p));

    return NextResponse.json({
      analysis: json.analysis,
      tag: json.tag ?? "average",
      updatedAt: new Date().toISOString(),
    } satisfies ClubAnalysis);
  } catch {
    // Billing/network issue — use local fallback
    return NextResponse.json(fallbackAnalysis(p));
  }
}
