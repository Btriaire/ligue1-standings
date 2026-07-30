// Ligue 2 fallback snapshot — Firestore-backed "last known good" copy of the
// FotMob-scraped standings + fixtures.
//
// Why: L2 has no official free API (football-data.org doesn't cover it), so
// the entire L2 pipeline — standings, results, squads, TV fixtures — depends
// on scraping FotMob's server-rendered __NEXT_DATA__ blob. That's fragile by
// nature (FotMob has changed page shape ~3x in the last year, per the
// comments in app/lib/fotmob.ts) and when it breaks, every L2 route used to
// just return an empty array with no explanation.
//
// This module gives the two highest-traffic L2 reads (standings, upcoming
// fixtures) a durable fallback: a daily cron (/api/cron/refresh-l2) snapshots
// a successful FotMob fetch into Firestore, and the live routes read from
// here when the live scrape throws — serving stale-but-real data instead of
// nothing, with `stale: true` + the snapshot's age so the UI can be honest
// about it.

import { getAdminFirestore } from "@/app/lib/firebase-admin";
import type { Standing } from "@/app/lib/types";
import type { FmLeagueMatch } from "@/app/lib/fotmob";

const COLLECTION = "l2Snapshot";

export interface L2StandingsSnapshot {
  standings: Standing[];
  updatedAt: string;
}
export interface L2MatchesSnapshot {
  matches: FmLeagueMatch[];
  updatedAt: string;
}

export async function writeL2StandingsSnapshot(standings: Standing[]): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc("standings").set({
    standings, updatedAt: new Date().toISOString(),
  });
}

export async function readL2StandingsSnapshot(): Promise<L2StandingsSnapshot | null> {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc("standings").get();
    if (!doc.exists) return null;
    return doc.data() as L2StandingsSnapshot;
  } catch {
    return null; // Firestore itself unreachable — caller falls back further.
  }
}

export async function writeL2MatchesSnapshot(matches: FmLeagueMatch[]): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc("matches").set({
    matches, updatedAt: new Date().toISOString(),
  });
}

export async function readL2MatchesSnapshot(): Promise<L2MatchesSnapshot | null> {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc("matches").get();
    if (!doc.exists) return null;
    return doc.data() as L2MatchesSnapshot;
  } catch {
    return null;
  }
}
