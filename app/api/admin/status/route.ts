import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminFirestore } from "@/app/lib/firebase-admin";
import { getAdminAuth } from "@/app/lib/firebase-admin";

export const dynamic = "force-dynamic";

const ADMIN_USER = process.env.ADMIN_USER ?? "Admin";
const COOKIE_NAME = "fp_admin";
const TTL = 8 * 3600 * 1000;

async function checkAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [user, tsStr] = decoded.split(":");
    return user === ADMIN_USER && Date.now() - parseInt(tsStr) < TTL;
  } catch { return false; }
}

// ── Check one URL and return latency ms or "error" ──────────────
async function ping(url: string, opts?: RequestInit): Promise<{ ok: boolean; ms: number }> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(6000) } as RequestInit);
    return { ok: res.ok, ms: Date.now() - t0 };
  } catch {
    return { ok: false, ms: Date.now() - t0 };
  }
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  // ── Run all health checks in parallel ─────────────────────────
  const [fd, us, sofa, gNews, firestoreInfo, userCount, sofaRows, compoRows] = await Promise.all([
    // football-data.org
    ping(`https://api.football-data.org/v4/competitions/FL1`, {
      headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY ?? "" },
    }),
    // Understat
    ping(`https://understat.com/league/Ligue_1/2025`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FootPredictom/1.0)" },
    }),
    // SofaScore
    ping(`https://api.sofascore.com/api/v1/team/1644/players`, {
      headers: { "Referer": "https://www.sofascore.com/", "User-Agent": "Mozilla/5.0" },
    }),
    // Google News RSS
    ping(`https://news.google.com/rss/search?q=ligue+1&hl=fr&gl=FR&ceid=FR:fr`),
    // Firestore: collection sizes
    (async () => {
      try {
        const db = getAdminFirestore();
        const [sofaSnap, compoSnap] = await Promise.all([
          db.collection("sofascore").count().get(),
          db.collection("compos").count().get(),
        ]);
        return {
          sofascore: sofaSnap.data().count,
          compos: compoSnap.data().count,
        };
      } catch { return { sofascore: null, compos: null }; }
    })(),
    // Firebase user count
    (async () => {
      try {
        const auth = getAdminAuth();
        const list = await auth.listUsers(1000);
        return list.users.length;
      } catch { return null; }
    })(),
    // SofaScore last fetch timestamp
    (async () => {
      try {
        const db = getAdminFirestore();
        const doc = await db.collection("sofascore").doc("524").get();
        return doc.exists ? (doc.data()?.fetchedAt ?? null) : null;
      } catch { return null; }
    })(),
    // Compos clubs count
    (async () => {
      try {
        const db = getAdminFirestore();
        const snap = await db.collection("compos").get();
        let total = 0;
        for (const club of snap.docs) {
          const votes = await club.ref.collection("votes").count().get();
          total += votes.data().count;
        }
        return total;
      } catch { return null; }
    })(),
  ]);

  return NextResponse.json({
    sources: [
      {
        name: "football-data.org",
        role: "Classement L1, résultats, buts (par match)",
        url: "https://api.football-data.org",
        status: fd.ok ? "ok" : "error",
        latencyMs: fd.ms,
        updateFreq: "En direct (cache 1min classement, 1h squad)",
        freeQuota: "10 req/min",
        replaceable: false,
        notes: "Source principale — classement & matchs",
      },
      {
        name: "Transfermarkt API (fly.dev)",
        role: "Effectif complet, valeurs marchandes, statuts blessure",
        url: "https://transfermarkt-api.fly.dev",
        status: "unknown",
        latencyMs: null,
        updateFreq: "Cache 1h",
        freeQuota: "Libre (wrapper non-officiel)",
        replaceable: true,
        notes: "Remplacé par SofaScore si cron a tourné",
      },
      {
        name: "Understat",
        role: "xG, xA, buts, passes déc. (par saison/joueur)",
        url: "https://understat.com",
        status: us.ok ? "ok" : "error",
        latencyMs: us.ms,
        updateFreq: "Cache 1h squad",
        freeQuota: "Scraping HTML (pas d'API officielle)",
        replaceable: false,
        notes: "Meilleure source xG disponible gratuite",
      },
      {
        name: "Datamb",
        role: "50+ stats per-90 par joueur (passes progressives, duels, presses…)",
        url: "https://datamb.football",
        status: "unknown",
        latencyMs: null,
        updateFreq: "Cache 1h — fichiers XLSX hebdo",
        freeQuota: "Libre (fichiers XLSX publics)",
        replaceable: false,
        notes: "Complète Understat côté défense/progression",
      },
      {
        name: "SofaScore API",
        role: "Blessures précises, valeur marchande, matchs next/last",
        url: "https://api.sofascore.com",
        status: sofa.ok ? "ok" : "error",
        latencyMs: sofa.ms,
        updateFreq: "Cron hebdo (lundi 03h UTC)",
        sofaLastFetch: sofaRows ? new Date(sofaRows).toLocaleString("fr-FR") : "jamais",
        freeQuota: "API publique non-officielle",
        replaceable: false,
        notes: "Seule source avec date retour blessure",
      },
      {
        name: "Google News RSS",
        role: "Actualités L1, Mondial, Mon Club (bandeau 3 colonnes)",
        url: "https://news.google.com/rss",
        status: gNews.ok ? "ok" : "error",
        latencyMs: gNews.ms,
        updateFreq: "Cache 20min",
        freeQuota: "Libre (RSS public)",
        replaceable: false,
        notes: "Aggrège RMC, L'Equipe, Foot01, etc.",
      },
      {
        name: "FBref (Sports Reference)",
        role: "Stats avancées : pressions, GCA, SCA, passes progressives reçues",
        url: "https://fbref.com",
        status: "blocked",
        latencyMs: null,
        updateFreq: "N/A",
        freeQuota: "Bloqué (403 + anti-bot agressif)",
        replaceable: false,
        notes: "⚠️ Inaccessible côté serveur — données uniques (pressures, SCA/GCA) non disponibles ailleurs",
      },
    ],
    crons: [
      {
        path: "/api/cron/warm-players",
        schedule: "0 6 * * * (tous les jours 06h UTC)",
        role: "Chauffe le cache squad des 18 clubs",
        lastRun: "voir Vercel Dashboard",
      },
      {
        path: "/api/cron/sofascore",
        schedule: "0 3 * * 1 (lundi 03h UTC)",
        role: "Scrape SofaScore — blessures, valeurs, matchs",
        lastRun: sofaRows ? new Date(sofaRows).toLocaleString("fr-FR") : "jamais",
      },
    ],
    firestore: {
      sofascoreClubs: firestoreInfo.sofascore,
      composClubs: firestoreInfo.compos,
      totalCompoVotes: compoRows,
    },
    firebase: {
      registeredUsers: userCount,
    },
    app: {
      base,
      env: process.env.NODE_ENV,
    },
  });
}
