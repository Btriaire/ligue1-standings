// Gemini-powered short summary of a news headline. 1-2 sentences in French.
// Used by the Mercato modal to give context beyond the bare headline. Falls
// back to an empty summary when the Gemini key is missing or the call fails.
//
// Cached 24h server-side (revalidate=86400) — same headline shouldn't be
// re-summarized.

import { NextResponse } from "next/server";
import { callGeminiJSON } from "@/app/lib/gemini";

export const revalidate = 86400;

export interface NewsSummary {
  summary: string;
  updatedAt: string;
}

function emptySummary(): NewsSummary {
  return { summary: "", updatedAt: new Date().toISOString() };
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const title = sp.get("title") ?? "";
  const club  = sp.get("club") ?? "";
  const type  = sp.get("type") ?? "";    // arrival|departure|rumor|news

  if (!title) {
    return NextResponse.json({ error: "Missing 'title'" }, { status: 400 });
  }

  const ctx = [
    `Titre: ${title}`,
    club  && `Club concerné: ${club}`,
    type  && `Type: ${type}`,
  ].filter(Boolean).join(" | ");

  const json = await callGeminiJSON<{ summary?: string }>({
    label: "news-summary",
    temperature: 0.3,
    systemInstruction:
      `Tu es un journaliste foot français. À partir d'un titre d'actualité mercato, rédige un résumé factuel de 2 phrases en français qui explique ce que dit probablement l'article.
Ne brode pas, ne fabrique pas de chiffres. Si le titre est trop vague, dis-le.
Réponds UNIQUEMENT en JSON: {"summary":"<2 phrases>"}`,
    prompt: ctx,
  });

  if (!json) return NextResponse.json(emptySummary());

  return NextResponse.json({
    summary: String(json.summary ?? "").slice(0, 600),
    updatedAt: new Date().toISOString(),
  } satisfies NewsSummary);
}
