// Mercato Board — isolated FotMob fetch for the "Bourse" view.
// Kept separate from /api/transfers (which aggregates RSS + Google News and
// fans out across 18 clubs) so the Boursier board can render even when the
// RSS pipeline is slow or rate-limited on Vercel.

import { NextRequest, NextResponse } from "next/server";
import {
  fetchFotMobLigue1, fetchFotMobLigue2,
  fetchFotMobTeamTransfers,
  fotmobCrest,
  type FmTransfer,
} from "@/app/lib/fotmob";

export const revalidate = 1800; // 30 min
export const maxDuration = 30;

export interface BoardTransfer {
  playerId: number;
  name: string;
  playerImage: string;       // FotMob CDN — falls back to placeholder client-side
  position?: string;
  fromClub: string;
  fromClubId: number;
  fromClubCrest: string;
  toClub: string;
  toClubId: number;
  toClubCrest: string;
  fee: string | null;
  marketValue: number | null; // EUR
  transferDate: string;       // ISO
  onLoan: boolean;
  contractExtension: boolean;
  transferType: string;       // "Transfer" | "Loan" | "Free transfer" | …
}

// FotMob returns `fee` as either a string or an object {feeText, localizedFeeText}.
// Normalize to a clean human-readable string for the UI.
function normalizeFee(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw.trim() || null;
  if (typeof raw === "object") {
    const o = raw as { feeText?: string; localizedFeeText?: string };
    const txt = o.feeText ?? o.localizedFeeText;
    if (!txt) return null;
    // Keys look like "on_loan" — turn into "On loan".
    const cleaned = txt.replace(/_/g, " ").trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return null;
}

function toBoardTransfer(tr: FmTransfer): BoardTransfer {
  return {
    playerId: tr.playerId,
    name: tr.name,
    playerImage: `https://images.fotmob.com/image_resources/playerimages/${tr.playerId}.png`,
    position: tr.position?.label,
    fromClub: tr.fromClubFullName ?? tr.fromClub,
    fromClubId: tr.fromClubId,
    fromClubCrest: tr.fromClubId ? fotmobCrest(tr.fromClubId) : "",
    toClub: tr.toClubFullName ?? tr.toClub,
    toClubId: tr.toClubId,
    toClubCrest: tr.toClubId ? fotmobCrest(tr.toClubId) : "",
    fee: normalizeFee(tr.fee),
    marketValue: tr.marketValue,
    transferDate: tr.transferDate,
    onLoan: tr.onLoan,
    contractExtension: tr.contractExtension,
    transferType: tr.transferType?.text ?? "",
  };
}

export async function GET(req: NextRequest) {
  const league = (new URL(req.url).searchParams.get("league") ?? "FL1").toUpperCase();

  try {
    const fm = league === "FL2" ? await fetchFotMobLigue2() : await fetchFotMobLigue1();

    // Fan out across all league teams — FotMob's league-level transfers
    // endpoint is capped at 100, but each team page has its own list.
    // Merging gives us a much richer pool for the market index chart.
    const teamIds = fm.table.map(t => t.id);
    const perTeam = await Promise.all(
      teamIds.map(id => fetchFotMobTeamTransfers(id).catch(() => [] as FmTransfer[]))
    );

    // Merge league + per-team, dedupe by playerId+transferDate so the same
    // transfer doesn't appear from both ends of the deal.
    const seen = new Set<string>();
    const merged: FmTransfer[] = [];
    for (const list of [fm.transfers, ...perTeam]) {
      for (const tr of list) {
        if (!tr.playerId || (!tr.toClub && !tr.fromClub)) continue;
        const key = `${tr.playerId}-${tr.transferDate}-${tr.toClubId ?? 0}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(tr);
      }
    }

    const transfers = merged.map(toBoardTransfer);

    // Cap at 500 — plenty for the chart, manageable payload size (~150 KB).
    // Boursier board still picks top 10 by market value, chart uses the rest.
    const top = [...transfers]
      .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
      .slice(0, 500);

    return NextResponse.json(
      { league, transfers: top, all: transfers.length, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600" } },
    );
  } catch (err) {
    // Return 200 with empty payload so the UI can degrade gracefully.
    return NextResponse.json({
      league, transfers: [], all: 0,
      error: err instanceof Error ? err.message : "FotMob unavailable",
      updatedAt: new Date().toISOString(),
    }, { status: 200, headers: { "Cache-Control": "public, s-maxage=120" } });
  }
}
