import { NextResponse } from "next/server";
import { callGeminiJSON } from "@/app/lib/gemini";

export const revalidate = 7200; // 2h cache

export interface ClubAnalysis {
  analysis: string;
  tag: "excellent" | "good" | "average" | "difficult" | "crisis";
  updatedAt: string;
}

// ── Fallback: generates a precise, data-driven analysis without Claude ─────────

function fallbackAnalysis(params: URLSearchParams): ClubAnalysis {
  const club    = params.get("club") ?? "Ce club";
  const pos     = parseInt(params.get("pos") ?? "10");
  const pts     = parseInt(params.get("pts") ?? "0");
  const gf      = parseInt(params.get("gf") ?? "0");
  const ga      = parseInt(params.get("ga") ?? "0");
  const form    = params.get("form") ?? "";
  const coach   = params.get("coach") ?? "";
  const injured = parseInt(params.get("injured") ?? "0");
  const value   = parseFloat(params.get("value") ?? "0");
  const recent  = params.get("recent") ?? "";

  const gd      = gf - ga;
  const wins    = parseInt(form.match(/(\d+)V/)?.[1] ?? "0");
  const draws   = parseInt(form.match(/(\d+)N/)?.[1] ?? "0");
  const losses  = parseInt(form.match(/(\d+)D/)?.[1] ?? "0");
  const played  = wins + draws + losses || 1;
  const pts3    = wins * 3 + draws;
  const pct     = Math.round((pts3 / (played * 3)) * 100);

  // Tag based on position (18-team league)
  const tag: ClubAnalysis["tag"] =
    pos <= 2  ? "excellent" :
    pos <= 5  ? "good" :
    pos <= 12 ? "average" :
    pos <= 15 ? "difficult" : "crisis";

  // Position label
  const posLabel =
    pos === 1 ? "leader incontesté de Ligue 1" :
    pos === 2 ? "dauphin du leader" :
    pos <= 3  ? `${pos}e, sur le podium` :
    pos <= 5  ? `${pos}e, qualifié pour l'Europe` :
    pos <= 7  ? `${pos}e, aux portes de l'Europe` :
    pos <= 12 ? `${pos}e en milieu de tableau` :
    pos <= 15 ? `${pos}e, dans la zone de turbulences` :
    pos <= 17 ? `${pos}e, en zone de relégation barrage` :
                `${pos}e, directement relégable`;

  // Form sentence
  const formLabel =
    pct >= 75 ? "en grande forme" :
    pct >= 60 ? "sur une bonne dynamique" :
    pct >= 45 ? "avec des résultats irréguliers" :
    pct >= 30 ? "en difficulté" : "dans une mauvaise passe";

  // Recent results sentence
  const recentParts = recent ? recent.split(",").filter(Boolean).slice(0, 4) : [];
  const recentStr = recentParts.length > 0
    ? ` Derniers résultats : ${recentParts.join(", ")}.`
    : "";

  // Goal balance sentence
  const gdStr =
    gd > 5  ? `Leur attaque est l'une des plus efficaces (${gf} buts pour, +${gd}).` :
    gd > 0  ? `Leur bilan offensif est positif (${gf} buts, +${gd}).` :
    gd === 0 ? `Le bilan offensif/défensif est équilibré (${gf} buts pour et contre).` :
    gd > -5 ? `La défense montre quelques failles (${ga} buts encaissés, ${gd}).` :
              `Les difficultés défensives sont préoccupantes (${ga} buts encaissés, ${gd}).`;

  // Extras
  const extras: string[] = [];
  if (injured >= 5) extras.push(`${injured} joueurs à l'infirmerie compliquent la tâche`);
  else if (injured >= 3) extras.push(`${injured} absences sur blessure`);
  if (coach) extras.push(`sous la houlette de ${coach}`);
  if (value > 0) extras.push(`effectif estimé à ${value}M€`);

  let s = `${club} est actuellement ${posLabel} avec ${pts} pts et se montre ${formLabel} (${wins}V ${draws}N ${losses}D sur ${played} matchs). ${gdStr}${recentStr}`;
  if (extras.length > 0) s += ` ${extras[0].charAt(0).toUpperCase() + extras[0].slice(1)}.`;

  return { analysis: s, tag, updatedAt: new Date().toISOString() };
}

// ── GET ────────────────────────────────────────────────────────────────────────

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

  // Parse position to determine league context
  const posNum = parseInt(pos);
  const leagueCtx =
    posNum <= 2  ? "en tête et vise le titre" :
    posNum <= 5  ? "en zone européenne" :
    posNum <= 12 ? "en milieu de tableau" :
    posNum <= 15 ? "en zone de turbulences" :
                  "en zone de relégation (18 clubs au total, 3 relégués directs)";

  const played = p.get("played") ?? "";
  const wins   = form.match(/(\d+)V/)?.[1] ?? "";
  const draws  = form.match(/(\d+)N/)?.[1] ?? "";
  const losses = form.match(/(\d+)D/)?.[1] ?? "";
  const formDetail = (wins || draws || losses)
    ? `${wins}V ${draws}N ${losses}D sur ${played || "?"} matchs joués`
    : "";

  const data = [
    `Club: ${club}`,
    `Position: ${pos}/18 (${leagueCtx})`,
    `Points: ${pts}${played ? ` en ${played} matchs joués` : ""}`,
    formDetail && `Bilan saison: ${formDetail}`,
    `Buts pour/contre: ${gf}/${ga} (diff: ${parseInt(gf as string) - parseInt(ga as string) >= 0 ? "+" : ""}${parseInt(gf as string) - parseInt(ga as string)})`,
    coach && `Entraîneur: ${coach}`,
    parseInt(injured) > 0 && `Blessés: ${injured}`,
    value && `Valeur effectif: ${value}M€`,
    recent && `Résultats récents: ${recent}`,
  ].filter(Boolean).join(" | ");

  const json = await callGeminiJSON<{ analysis?: string; tag?: ClubAnalysis["tag"] }>({
    label: "club-analysis",
    systemInstruction: `Tu es un analyste Ligue 1 expert. Rédige une analyse factuelle et précise en 2-3 phrases en français.
Utilise les données exactes fournies (position, points, buts, forme). Mentionne les points forts ET les points faibles.
Sois précis sur la situation sportive réelle (zone européenne = top 5, relégation = bottom 3 sur 18).
Réponds UNIQUEMENT en JSON: {"analysis":"...","tag":"excellent|good|average|difficult|crisis"}
Tags: excellent=top2, good=top5, average=6-12, difficult=13-15, crisis=16-18`,
    prompt: data,
  });

  if (!json?.analysis) return NextResponse.json(fallbackAnalysis(p));

  return NextResponse.json({
    analysis: json.analysis,
    tag: json.tag ?? "average",
    updatedAt: new Date().toISOString(),
  } satisfies ClubAnalysis);
}
