// Static broadcast rights for L1 / L2 / World Cup 2026.
//
// Why static? There's no free public API that returns French/international
// TV rights per match. Curating a small JSON map of the rights holders for
// each competition is faster, more accurate, and easier to keep current
// than scraping a third-party schedule site that may be paywalled or
// geo-restricted.
//
// Shape choice: each competition declares a `default` channel array (the
// rights holders that broadcast every match by default — e.g. Ligue 1+ in
// France for FL1 2025-26) plus an optional `perMatchday` or `featured`
// override list for marquee fixtures that move to a free-to-air channel
// like TF1 or M6. The route layer joins these with the live fixture feed.
//
// Update cadence: ahead of each season + before each major tournament. The
// values below reflect the FIFA WC 2026 broadcast deals announced as of
// early 2026 (TF1/M6/beIN in France, FOX/Telemundo in the US, BBC/ITV
// in the UK, CTV/TSN in Canada, etc.).

export type Region =
  | "FR"   // France
  | "BE"   // Belgique (francophone)
  | "CH"   // Suisse
  | "UK"   // United Kingdom
  | "US"   // United States
  | "CA"   // Canada (host)
  | "MX"   // Mexico (host)
  | "ES"   // Spain
  | "DE"   // Germany
  | "IT"   // Italy
  | "BR"   // Brazil
  | "INT"; // International / multi-region

export interface Broadcaster {
  /** Display name shown to the user (e.g. "Ligue 1+", "beIN Sports 1"). */
  name: string;
  /** Region of distribution. Drives flag + grouping in the UI. */
  region: Region;
  /** Free-to-air? Surfaced as a 🟢 badge to highlight free options. */
  free?: boolean;
  /** Streaming-only? Surfaced as a 💻 badge so users know it's not on TV. */
  streaming?: boolean;
  /** Watch URL or launch deep link (optional). */
  url?: string;
}

export const REGION_FLAGS: Record<Region, string> = {
  FR: "🇫🇷",
  BE: "🇧🇪",
  CH: "🇨🇭",
  UK: "🇬🇧",
  US: "🇺🇸",
  CA: "🇨🇦",
  MX: "🇲🇽",
  ES: "🇪🇸",
  DE: "🇩🇪",
  IT: "🇮🇹",
  BR: "🇧🇷",
  INT: "🌍",
};

export const REGION_LABELS: Record<Region, string> = {
  FR: "France",
  BE: "Belgique",
  CH: "Suisse",
  UK: "Royaume-Uni",
  US: "États-Unis",
  CA: "Canada",
  MX: "Mexique",
  ES: "Espagne",
  DE: "Allemagne",
  IT: "Italie",
  BR: "Brésil",
  INT: "International",
};

// ── Ligue 1 (2025-2026) ──────────────────────────────────────────────────────
// Domestic rights holders for the 2025-26 season:
//   • Ligue1+: LFP's own streaming platform (took over 8 of 9 weekly matches
//     after DAZN exited). Subscription required.
//   • beIN Sports: 1 match per matchday (Saturday 17:00 slot, usually).
//   • France 2 / France 3: occasional highlight magazine, not live games.
// International:
//   • CBS Sports (US), TSN (Canada), DAZN (Germany/Italy/Spain), GOL TV (BR).

const LIGUE1_DEFAULT: Broadcaster[] = [
  { name: "Ligue 1+",      region: "FR", streaming: true, url: "https://www.ligue1.fr/ligue1plus" },
  { name: "beIN Sports 1", region: "FR" },
  { name: "Canal+ Foot",   region: "FR", url: "https://www.canalplus.com" }, // affiche du dimanche soir
  { name: "TSN+",          region: "CA", streaming: true },
  { name: "CBS Sports",    region: "US", streaming: true },
  { name: "DAZN",          region: "DE", streaming: true },
  { name: "GOAT",          region: "INT", streaming: true },
];

// ── Ligue 2 (2025-2026) ──────────────────────────────────────────────────────
// beIN Sports holds exclusive French rights. International coverage is sparse
// — most countries don't carry L2 live; FotMob/365Scores apps stream highlights.

const LIGUE2_DEFAULT: Broadcaster[] = [
  { name: "beIN Sports 2", region: "FR" },
  { name: "beIN CONNECT",  region: "FR", streaming: true, url: "https://www.beinsports.com/fr" },
  { name: "Multisports beIN", region: "FR" },
  { name: "FotMob",        region: "INT", streaming: true, url: "https://www.fotmob.com" }, // résumés + commentaire live
];

// ── World Cup 2026 ───────────────────────────────────────────────────────────
// Domestic (FR): TF1 + M6 share the 64 matches (TF1: ~28, M6: ~28, beIN: all
// 104 with the new 48-team format). The schedule below maps the headline
// broadcasters by region — actual per-match allocation moves around but TF1/M6
// always carry the France games and most knockouts; beIN Sports carries every
// game on pay-TV.
//
// US: FOX (English) + Telemundo (Spanish) hold exclusive rights.
// UK: BBC + ITV share, both free-to-air.
// CA: CTV + TSN + RDS (French CA).
// MX: Televisa + TV Azteca (host).
//
// Free-to-air matters here because the WC is a national TV event — we mark
// FTA channels so the UI can highlight "regardable gratuitement" matches.

const WORLDCUP_DEFAULT: Broadcaster[] = [
  // France
  { name: "TF1",           region: "FR", free: true, url: "https://www.tf1.fr" },
  { name: "M6",            region: "FR", free: true, url: "https://www.6play.fr" },
  { name: "beIN Sports 1", region: "FR", url: "https://www.beinsports.com/fr" },
  // Belgique
  { name: "RTBF",          region: "BE", free: true, url: "https://www.rtbf.be/auvio" },
  // Suisse
  { name: "RTS",           region: "CH", free: true, url: "https://www.rts.ch/sport" },
  // Royaume-Uni
  { name: "BBC One",       region: "UK", free: true, url: "https://www.bbc.co.uk/iplayer" },
  { name: "ITV1",          region: "UK", free: true, url: "https://www.itv.com/itvx" },
  // États-Unis
  { name: "FOX",           region: "US", free: true, url: "https://www.foxsports.com" },
  { name: "Telemundo",     region: "US", url: "https://www.telemundodeportes.com" },
  // Canada (hôte)
  { name: "CTV",           region: "CA", free: true, url: "https://www.bellmedia.ca/ctv" },
  { name: "TSN",           region: "CA", url: "https://www.tsn.ca" },
  { name: "RDS",           region: "CA", url: "https://www.rds.ca" },
  // Mexique (hôte)
  { name: "Televisa",      region: "MX", free: true },
  { name: "TV Azteca",     region: "MX", free: true },
  // Autres marchés clés
  { name: "RAI",           region: "IT", free: true },
  { name: "RTVE / La 1",   region: "ES", free: true },
  { name: "ARD / ZDF",     region: "DE", free: true },
  { name: "Globo",         region: "BR", free: true },
];

export type Competition = "FL1" | "FL2" | "WC2026";

export const COMPETITION_LABELS: Record<Competition, string> = {
  FL1: "Ligue 1",
  FL2: "Ligue 2",
  WC2026: "Coupe du Monde 2026",
};

/** Default channel list for a competition. The route layer can override this
 *  per match (e.g. France games on WC always have TF1 even if usually M6). */
export function defaultBroadcasters(competition: Competition): Broadcaster[] {
  switch (competition) {
    case "FL1":    return LIGUE1_DEFAULT;
    case "FL2":    return LIGUE2_DEFAULT;
    case "WC2026": return WORLDCUP_DEFAULT;
  }
}

/** Group broadcasters by region with France always first. Used by the UI to
 *  render a "France / International" two-column layout consistently. */
export function groupByRegion(channels: Broadcaster[]): { region: Region; items: Broadcaster[] }[] {
  const map = new Map<Region, Broadcaster[]>();
  for (const c of channels) {
    if (!map.has(c.region)) map.set(c.region, []);
    map.get(c.region)!.push(c);
  }
  const order: Region[] = ["FR", "BE", "CH", "UK", "US", "CA", "MX", "ES", "DE", "IT", "BR", "INT"];
  return order
    .filter(r => map.has(r))
    .map(r => ({ region: r, items: map.get(r)! }));
}
