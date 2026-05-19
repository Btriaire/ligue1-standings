// Public read-only endpoint. Returns the bundled defaults from
// `app/lib/fanConfig.ts` merged with admin overrides stored in Firestore
// (`fanConfig/entries`). Falls back to defaults silently if Firestore is
// unreachable so the UI never breaks.

import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebase-admin";
import {
  FAN_CLUBS_L1,
  FAN_CLUBS_L2,
  FAN_NATIONS,
  type FanEntry,
} from "@/app/lib/fanConfig";

export const dynamic = "force-dynamic";
// Cache the merged response for 5 minutes on the edge.
export const revalidate = 300;

function defaults(): Record<string, FanEntry> {
  const out: Record<string, FanEntry> = {};
  for (const [id, entry] of Object.entries(FAN_CLUBS_L1))   out[`club:${id}`]   = entry;
  for (const [id, entry] of Object.entries(FAN_CLUBS_L2))   out[`club:${id}`]   = entry;
  for (const [code, entry] of Object.entries(FAN_NATIONS))  out[`nation:${code}`] = entry;
  return out;
}

export async function GET() {
  const merged = defaults();
  try {
    const db = getAdminFirestore();
    const doc = await db.collection("fanConfig").doc("entries").get();
    if (doc.exists) {
      const raw = doc.data() ?? {};
      for (const [k, v] of Object.entries(raw)) {
        if (k.startsWith("_")) continue;
        if (v && typeof v === "object") merged[k] = v as FanEntry;
      }
    }
  } catch {
    // Firestore unreachable — defaults are still useful.
  }
  return NextResponse.json({ entries: merged });
}
