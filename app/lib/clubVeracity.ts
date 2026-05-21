// Veracity checker — compares CLUB_PROFILES leadership data against the
// current FR Wikipedia infobox. Pulls section 0 wikitext via the MediaWiki
// action API (lighter and easier to parse than full HTML), then regex-extracts
// the most volatile fields: entraîneur, président, stade, capitaine.
//
// Used by /api/club-veracity (cron) and /admin/veracity (read-only UI).

import { CLUB_PROFILES, type ClubProfile } from "@/app/lib/clubProfile";

// Wikipedia page title (FR) for each club. When missing, the club is skipped.
// Spaces will be encoded by encodeURIComponent — keep the human-readable form.
export const WIKI_TITLES: Record<number, string> = {
  524:  "Paris Saint-Germain",
  548:  "AS Monaco",
  516:  "Olympique de Marseille",
  521:  "LOSC Lille",
  529:  "Stade rennais Football Club",
  522:  "OGC Nice",
  546:  "Racing Club de Lens",
  523:  "Olympique lyonnais",
  576:  "Racing Club de Strasbourg Alsace",
  511:  "Toulouse Football Club",
  512:  "Stade brestois 29",
  532:  "Angers SCO",
  533:  "Le Havre AC",
  519:  "AJ Auxerre",
  543:  "FC Nantes",
  545:  "FC Metz",
  525:  "FC Lorient",
  1045: "Paris FC",
  // ── Ligue 2 ──
  10242: "Espérance sportive Troyes Aube Champagne",
  9853:  "Association sportive de Saint-Étienne",
  9837:  "Stade de Reims",
  10249: "Montpellier Hérault Sport Club",
  8311:  "Clermont Foot 63",
  9747:  "En Avant Guingamp",
  8682:  "Le Mans Football Club",
  6390:  "Red Star Football Club",
  4120:  "Rodez Aveyron Football",
  293352:"Football Club d'Annecy",
  6355:  "Pau Football Club",
  47214: "Union sportive de Boulogne Côte d'Opale",
  9855:  "Grenoble Foot 38",
  8481:  "AS Nancy-Lorraine",
  4170:  "Union sportive Boulogne Côte d'Opale",
  7853:  "Stade lavallois Mayenne FC",
  7794:  "Sporting Club de Bastia",
  8587:  "Amiens SC",
};

interface ParseResponse {
  parse?: {
    wikitext?: { "*": string };
  };
}

async function fetchInfoboxWikitext(title: string): Promise<string | null> {
  const url = `https://fr.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&section=0&format=json&origin=*`;
  const res = await fetch(url, {
    headers: { "User-Agent": "footagent-veracity/1.0 (data freshness check)" },
    next: { revalidate: 86400 }, // 24h cache
  });
  if (!res.ok) return null;
  const data = (await res.json()) as ParseResponse;
  return data.parse?.wikitext?.["*"] ?? null;
}

// Strip wiki markup: [[Foo|Bar]] → Bar, [[Foo]] → Foo, {{lien|Foo}} → Foo,
// remove '' bold/italic, footnotes <ref>…</ref>, and HTML tags.
function stripWiki(s: string): string {
  return s
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\{lien\|(?:[^|}]+\|)?([^|}]+)(?:\|[^}]*)?\}\}/gi, "$1")
    .replace(/\{\{[^{}]+\}\}/g, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/'''?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract value of an infobox parameter. Wiki infobox params look like:
//   | entraîneur          = [[Habib Beye]]
//   | président            = Pablo Longoria
// The value can span multiple lines until the next `\n|` or `}}`.
function extractParam(wikitext: string, names: string[]): string | null {
  for (const name of names) {
    // Match `| name = value\n|` (greedy across newlines until next param).
    const re = new RegExp(`\\|\\s*${name}\\s*=\\s*([\\s\\S]*?)(?=\\n\\s*\\||\\n\\}\\})`, "i");
    const m = wikitext.match(re);
    if (m) {
      const stripped = stripWiki(m[1]);
      if (stripped) return stripped;
    }
  }
  return null;
}

export interface FieldCheck {
  field: "entraineur" | "president" | "stade" | "capitaine";
  expected: string | undefined; // from CLUB_PROFILES
  actual: string | null;        // from Wikipedia
  match: boolean;
}

export interface ClubVeracityReport {
  id: number;
  name: string;
  league: "L1" | "L2";
  wikiTitle: string;
  ok: boolean; // true if all defined fields match
  checks: FieldCheck[];
  error?: string;
}

// Light tolerance: compare lower-cased + diacritic-folded substrings, so
// "Habib Beye" matches "Habib Beye (depuis 2026)" or "Beye, Habib".
function similar(a: string | undefined, b: string | null): boolean {
  if (!a || !b) return false;
  const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const fa = fold(a), fb = fold(b);
  if (!fa || !fb) return false;
  return fa === fb || fb.includes(fa) || fa.includes(fb);
}

export async function checkClub(profile: ClubProfile): Promise<ClubVeracityReport> {
  const wikiTitle = WIKI_TITLES[profile.id];
  if (!wikiTitle) {
    return {
      id: profile.id, name: profile.name, league: profile.league,
      wikiTitle: "", ok: false, checks: [], error: "No wiki title mapping",
    };
  }
  try {
    const wt = await fetchInfoboxWikitext(wikiTitle);
    if (!wt) {
      return {
        id: profile.id, name: profile.name, league: profile.league,
        wikiTitle, ok: false, checks: [], error: "Wiki fetch failed",
      };
    }
    const coachRaw     = extractParam(wt, ["entraîneur", "entraineur", "manager"]);
    const presidentRaw = extractParam(wt, ["président", "president", "dirigeant principal"]);
    const stadeRaw     = extractParam(wt, ["stade", "enceinte"]);
    const capRaw       = extractParam(wt, ["capitaine"]);

    const checks: FieldCheck[] = [
      { field: "entraineur", expected: profile.entraineur,       actual: coachRaw,     match: similar(profile.entraineur, coachRaw) },
      { field: "president",  expected: profile.president,        actual: presidentRaw, match: similar(profile.president,  presidentRaw) },
      { field: "stade",      expected: profile.stade.nom,        actual: stadeRaw,     match: similar(profile.stade.nom,  stadeRaw) },
      { field: "capitaine",  expected: profile.capitaine,        actual: capRaw,       match: profile.capitaine ? similar(profile.capitaine, capRaw) : true },
    ];
    const ok = checks.every(c => c.match || !c.expected);
    return {
      id: profile.id, name: profile.name, league: profile.league,
      wikiTitle, ok, checks,
    };
  } catch (err) {
    return {
      id: profile.id, name: profile.name, league: profile.league,
      wikiTitle, ok: false, checks: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function checkAllClubs(): Promise<ClubVeracityReport[]> {
  const profiles = Object.values(CLUB_PROFILES);
  // Sequential-ish but parallel in small batches to be polite to Wikipedia.
  const reports: ClubVeracityReport[] = [];
  const BATCH = 6;
  for (let i = 0; i < profiles.length; i += BATCH) {
    const slice = profiles.slice(i, i + BATCH);
    const batch = await Promise.all(slice.map(checkClub));
    reports.push(...batch);
  }
  return reports;
}
