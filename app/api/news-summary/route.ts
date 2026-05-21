// Gemini-powered short summary of a news headline. 1-2 sentences in French.
// Used by the Mercato modal to give context beyond the bare headline. Falls
// back to an empty summary when the Gemini key is missing.
//
// Cached 24h server-side (revalidate=86400) — same headline shouldn't be
// re-summarized.

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const revalidate = 86400;

export interface NewsSummary {
  summary: string;
  updatedAt: string;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const title = sp.get("title") ?? "";
  const club  = sp.get("club") ?? "";
  const type  = sp.get("type") ?? "";    // arrival|departure|rumor|news

  if (!title) {
    return NextResponse.json({ error: "Missing 'title'" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ summary: "", updatedAt: new Date().toISOString() } satisfies NewsSummary);
  }

  const ctx = [
    `Titre: ${title}`,
    club  && `Club concerné: ${club}`,
    type  && `Type: ${type}`,
  ].filter(Boolean).join(" | ");

  try {
    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        `Tu es un journaliste foot français. À partir d'un titre d'actualité mercato, rédige un résumé factuel de 2 phrases en français qui explique ce que dit probablement l'article.
Ne brode pas, ne fabrique pas de chiffres. Si le titre est trop vague, dis-le.
Réponds UNIQUEMENT en JSON: {"summary":"<2 phrases>"}`,
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
    });
    const result = await model.generateContent(ctx);
    const text = result.response.text();
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    return NextResponse.json({
      summary: String(json.summary ?? "").slice(0, 600),
      updatedAt: new Date().toISOString(),
    } satisfies NewsSummary);
  } catch (err) {
    console.warn("[/api/news-summary] gemini failed:", err);
    return NextResponse.json({ summary: "", updatedAt: new Date().toISOString() } satisfies NewsSummary);
  }
}
