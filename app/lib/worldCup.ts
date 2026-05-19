// World Cup 2026 — shared dates and country data.

export const WC2026_START = new Date("2026-06-11T00:00:00Z");
export const WC2026_END   = new Date("2026-07-19T23:59:59Z");

/** Number of days BEFORE the opening match where we already light up the
 *  CdM tab/UI ("quelques jours avant"). */
export const WC_PRELUDE_DAYS = 21;
/** Number of days AFTER the final to keep the highlight ("encore frais"). */
export const WC_AFTERGLOW_DAYS = 3;

/** True if the World Cup is "hot": within the prelude window, during the
 *  tournament, or in the afterglow window. Pure function of `now`. */
export function isWorldCupHot(now: Date = new Date()): boolean {
  const start = new Date(WC2026_START);
  start.setUTCDate(start.getUTCDate() - WC_PRELUDE_DAYS);
  const end = new Date(WC2026_END);
  end.setUTCDate(end.getUTCDate() + WC_AFTERGLOW_DAYS);
  return now >= start && now <= end;
}

/** Days until the World Cup opener (negative if already started/over). */
export function daysUntilWorldCup(now: Date = new Date()): number {
  const ms = WC2026_START.getTime() - now.getTime();
  return Math.round(ms / 86_400_000);
}

/** Coarse phase label for the current date. */
export function worldCupPhase(now: Date = new Date()): "before" | "live" | "after" | "off" {
  if (!isWorldCupHot(now)) return "off";
  if (now < WC2026_START) return "before";
  if (now > WC2026_END)   return "after";
  return "live";
}

// ─── Nations (32 qualified + hosts marked with ★ in WorldCupTab GROUPS) ─────
// Used by Mon Club to let users follow a national team during the World Cup.

export interface Nation {
  code: string;    // ISO-ish short code, stable id for storage
  name: string;    // French label
  flag: string;    // emoji flag
  group: string;   // single letter A–L
  host?: boolean;  // co-host country (USA/Canada/Mexico)
}

export const NATIONS: Nation[] = [
  // Group A
  { code: "ARG", name: "Argentine",         flag: "🇦🇷", group: "A" },
  { code: "CHI", name: "Chili",             flag: "🇨🇱", group: "A" },
  { code: "PER", name: "Pérou",             flag: "🇵🇪", group: "A" },
  { code: "AUS", name: "Australie",         flag: "🇦🇺", group: "A" },
  // Group B
  { code: "MEX", name: "Mexique",           flag: "🇲🇽", group: "B", host: true },
  { code: "JAM", name: "Jamaïque",          flag: "🇯🇲", group: "B" },
  { code: "VEN", name: "Venezuela",         flag: "🇻🇪", group: "B" },
  { code: "ECU", name: "Équateur",          flag: "🇪🇨", group: "B" },
  // Group C
  { code: "USA", name: "USA",               flag: "🇺🇸", group: "C", host: true },
  { code: "PAN", name: "Panama",            flag: "🇵🇦", group: "C" },
  { code: "CUB", name: "Cuba",              flag: "🇨🇺", group: "C" },
  { code: "NZL", name: "Nouvelle-Zélande",  flag: "🇳🇿", group: "C" },
  // Group D
  { code: "CAN", name: "Canada",            flag: "🇨🇦", group: "D", host: true },
  { code: "HON", name: "Honduras",          flag: "🇭🇳", group: "D" },
  { code: "URU", name: "Uruguay",           flag: "🇺🇾", group: "D" },
  { code: "POR", name: "Portugal",          flag: "🇵🇹", group: "D" },
  // Group E
  { code: "ESP", name: "Espagne",           flag: "🇪🇸", group: "E" },
  { code: "MAR", name: "Maroc",             flag: "🇲🇦", group: "E" },
  { code: "BEL", name: "Belgique",          flag: "🇧🇪", group: "E" },
  { code: "JPN", name: "Japon",             flag: "🇯🇵", group: "E" },
  // Group F
  { code: "FRA", name: "France",            flag: "🇫🇷", group: "F" },
  { code: "KSA", name: "Arabie Saoudite",   flag: "🇸🇦", group: "F" },
  { code: "SUI", name: "Suisse",            flag: "🇨🇭", group: "F" },
  { code: "ALG", name: "Algérie",           flag: "🇩🇿", group: "F" },
  // Group G
  { code: "BRA", name: "Brésil",            flag: "🇧🇷", group: "G" },
  { code: "COL", name: "Colombie",          flag: "🇨🇴", group: "G" },
  { code: "PAR", name: "Paraguay",          flag: "🇵🇾", group: "G" },
  { code: "CMR", name: "Cameroun",          flag: "🇨🇲", group: "G" },
  // Group H
  { code: "GER", name: "Allemagne",         flag: "🇩🇪", group: "H" },
  { code: "NED", name: "Pays-Bas",          flag: "🇳🇱", group: "H" },
  { code: "POL", name: "Pologne",           flag: "🇵🇱", group: "H" },
  { code: "SRB", name: "Serbie",            flag: "🇷🇸", group: "H" },
  // Group I
  { code: "ENG", name: "Angleterre",        flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "I" },
  { code: "SEN", name: "Sénégal",           flag: "🇸🇳", group: "I" },
  { code: "TUN", name: "Tunisie",           flag: "🇹🇳", group: "I" },
  { code: "CRC", name: "Costa Rica",        flag: "🇨🇷", group: "I" },
  // Group J
  { code: "ITA", name: "Italie",            flag: "🇮🇹", group: "J" },
  { code: "CRO", name: "Croatie",           flag: "🇭🇷", group: "J" },
  { code: "ROU", name: "Roumanie",          flag: "🇷🇴", group: "J" },
  { code: "ANG", name: "Angola",            flag: "🇦🇴", group: "J" },
  // Group K
  { code: "UKR", name: "Ukraine",           flag: "🇺🇦", group: "K" },
  { code: "GHA", name: "Ghana",             flag: "🇬🇭", group: "K" },
  { code: "RSA", name: "Afrique du Sud",    flag: "🇿🇦", group: "K" },
  { code: "COD", name: "RD Congo",          flag: "🇨🇩", group: "K" },
  // Group L
  { code: "KOR", name: "Corée du Sud",      flag: "🇰🇷", group: "L" },
  { code: "CIV", name: "Côte d'Ivoire",     flag: "🇨🇮", group: "L" },
  { code: "ZIM", name: "Zimbabwe",          flag: "🇿🇼", group: "L" },
  { code: "KEN", name: "Kenya",             flag: "🇰🇪", group: "L" },
];

export function findNation(code: string): Nation | null {
  return NATIONS.find((n) => n.code === code) ?? null;
}

export function nationsInGroup(group: string): Nation[] {
  return NATIONS.filter((n) => n.group === group);
}
