import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebase-admin";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

/* ── POST: save one user's compo ─────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { clubId, clubName, formation, players, sessionId } = await req.json() as {
      clubId: number;
      clubName: string;
      formation: string;
      players: (string | null)[];
      sessionId: string;
    };

    if (!Number.isInteger(clubId) || !/^\d(-\d){2,3}$/.test(formation) || !Array.isArray(players) || players.length !== 11
      || !players.every(p => p === null || (typeof p === "string" && p.length <= 60))
      || typeof sessionId !== "string" || sessionId.length < 8 || sessionId.length > 64) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // One vote per network per club: the IP is hashed and bound to the first
    // sessionId that voted from it. Shared networks (cafés, carrier NAT) share a vote.
    const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
    const ipKey = createHash("sha256").update(ip).digest("hex");
    const db = getAdminFirestore();
    const clubRef = db.collection("compos").doc(String(clubId));
    const ipRef = clubRef.collection("ipVotes").doc(ipKey);
    const bound = await ipRef.get();
    if (bound.exists && (bound.data() as { sessionId?: string }).sessionId !== sessionId) {
      return NextResponse.json({ error: "Un seul vote par connexion pour ce club" }, { status: 429 });
    }
    await ipRef.set({ sessionId, savedAt: Date.now() });

    // One vote per sessionId per club — upsert
    await clubRef
      .collection("votes")
      .doc(sessionId)
      .set({
        clubId,
        clubName,
        formation,
        players,           // array of 11 strings | null
        savedAt: Date.now(),
      });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("compo POST error", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

/* ── GET: aggregate votes for a club ─────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clubId = searchParams.get("clubId");
    if (!clubId) return NextResponse.json({ error: "Missing clubId" }, { status: 400 });

    const db = getAdminFirestore();
    const snap = await db
      .collection("compos")
      .doc(clubId)
      .collection("votes")
      .get();

    if (snap.empty) return NextResponse.json({ votes: 0, formation: null, players: [] });

    // Count formations
    const formCounts: Record<string, number> = {};
    // Count players per slot index
    const slotCounts: Record<number, Record<string, number>> = {};

    snap.forEach(doc => {
      const d = doc.data() as { formation: string; players: (string|null)[] };
      formCounts[d.formation] = (formCounts[d.formation] ?? 0) + 1;
      d.players.forEach((name, idx) => {
        if (!name) return;
        if (!slotCounts[idx]) slotCounts[idx] = {};
        slotCounts[idx][name] = (slotCounts[idx][name] ?? 0) + 1;
      });
    });

    // Most common formation
    const bestFormation = Object.entries(formCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "4-3-3";

    // Most voted player per slot
    const bestPlayers: (string | null)[] = Array.from({ length: 11 }, (_, i) => {
      const counts = slotCounts[i] ?? {};
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return sorted[0]?.[0] ?? null;
    });

    // Per-slot vote details
    const slotDetails = Array.from({ length: 11 }, (_, i) => {
      const counts = slotCounts[i] ?? {};
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));
    });

    return NextResponse.json({
      votes: snap.size,
      formation: bestFormation,
      players: bestPlayers,
      slotDetails,
      formCounts,
    });
  } catch (e) {
    console.error("compo GET error", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
