// Single Gemini entry point. Every AI route in this app talks to Google's
// Generative AI through this helper — keeps SDK init, JSON-mode config,
// timeouts and error handling consistent and trims ~25 LOC per caller.
//
// Contract: returns parsed JSON of type T, or `null` when:
//   - GEMINI_API_KEY is missing
//   - the call errors out or times out
//   - the response has no JSON object we can extract
// Callers MUST handle `null` with a deterministic fallback so the user never
// sees infra messages like "activez la clé Gemini".

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CallGeminiOptions {
  /** System instruction — defines the assistant's role and output schema. */
  systemInstruction: string;
  /** User-side prompt content (data, context, the actual question). */
  prompt: string;
  /** Defaults to "gemini-2.0-flash". Use "-flash-lite" for cheaper sentiment. */
  model?: string;
  /** 0..1, lower = more deterministic. Omit to use Gemini's default. */
  temperature?: number;
  /** When true (default) sets responseMimeType: application/json. */
  jsonMode?: boolean;
  /** Hard timeout. Defaults to 15s — Gemini-2.0-flash usually answers <3s. */
  timeoutMs?: number;
  /** Identifier for log lines. Defaults to "gemini". */
  label?: string;
}

export async function callGeminiJSON<T = unknown>(opts: CallGeminiOptions): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const {
    systemInstruction,
    prompt,
    model = "gemini-2.0-flash",
    temperature,
    jsonMode = true,
    timeoutMs = 15000,
    label = "gemini",
  } = opts;

  try {
    const genai = new GoogleGenerativeAI(apiKey);
    const m = genai.getGenerativeModel({
      model,
      systemInstruction,
      generationConfig: {
        ...(temperature !== undefined ? { temperature } : {}),
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    });

    const result = await Promise.race([
      m.generateContent(prompt),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error(`${label} timeout ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);

    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}/)?.[0];
    if (!match) return null;
    return JSON.parse(match) as T;
  } catch (err) {
    console.warn(`[${label}] ${model} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/** Quick presence check — useful for "feature available?" gating without a call. */
export function geminiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
