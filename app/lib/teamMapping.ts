// football-data.org team ID → Transfermarkt club ID
export const TEAM_TM_MAP: Record<number, number | null> = {
  524: 583,   // PSG
  546: 826,   // Lens
  523: 1041,  // Lyon
  521: 1082,  // Lille
  529: 3,     // Rennes
  548: 162,   // Monaco
  516: 244,   // Marseille
  576: 667,   // Strasbourg
  525: 1158,  // Lorient
  511: 415,   // Toulouse
  1045: null, // Paris FC (newly promoted, no TM data)
  512: 3911,  // Brest
  532: 237,   // Angers
  533: 738,   // Le Havre
  522: 417,   // Nice
  519: 485,   // Auxerre
  543: 995,   // Nantes
  545: 347,   // Metz
};

// Economic strength score (0-100) based on public data:
// owner wealth, annual revenue, investment level, UEFA financial reports
export const ECONOMIC_SCORES: Record<number, { score: number; label: string; revenue: string; owner: string }> = {
  524: { score: 96, label: "Très fort", revenue: "~800M€/an", owner: "QSI (Qatar)" },
  546: { score: 55, label: "Stable",   revenue: "~90M€/an",  owner: "Hafiz Mammadov" },
  523: { score: 54, label: "Instable", revenue: "~180M€/an", owner: "IDG Capital (Chine)" },
  521: { score: 62, label: "Solide",   revenue: "~110M€/an", owner: "Merlyn Partners" },
  529: { score: 61, label: "Solide",   revenue: "~130M€/an", owner: "Famille Pinault" },
  548: { score: 82, label: "Très fort", revenue: "~200M€/an", owner: "Dmitry Rybolovlev" },
  516: { score: 68, label: "Fort",     revenue: "~170M€/an", owner: "Frank McCourt (USA)" },
  576: { score: 72, label: "Fort",     revenue: "~120M€/an", owner: "BlueCo / Boehly (Chelsea)" },
  525: { score: 42, label: "Faible",   revenue: "~50M€/an",  owner: "Loïc Féry" },
  511: { score: 51, label: "Moyen",    revenue: "~75M€/an",  owner: "RedBird Capital (USA)" },
  1045: { score: 45, label: "Moyen",   revenue: "~60M€/an",  owner: "Pierre-Dreyfus / Paris" },
  512: { score: 44, label: "Moyen",    revenue: "~55M€/an",  owner: "Denis Le Saint" },
  532: { score: 41, label: "Faible",   revenue: "~45M€/an",  owner: "Saïd Chabane" },
  533: { score: 40, label: "Faible",   revenue: "~40M€/an",  owner: "Vincent Volpe" },
  522: { score: 66, label: "Fort",     revenue: "~150M€/an", owner: "INEOS / Jim Ratcliffe" },
  519: { score: 39, label: "Faible",   revenue: "~40M€/an",  owner: "ABA Pro Group" },
  543: { score: 47, label: "Moyen",    revenue: "~70M€/an",  owner: "Waldemar Kita" },
  545: { score: 37, label: "Précaire", revenue: "~35M€/an",  owner: "FC Metz SASP" },
};

// Reddit subreddits for fan sentiment (null = use r/ligue1 search)
export const CLUB_SUBREDDITS: Record<number, string | null> = {
  524: "psg",
  546: "rclens",
  523: "OlympiqueLyonnais",
  521: "LOSC",
  529: null,          // Rennes → r/ligue1 search
  548: "ASMonaco",
  516: "olympiquedemarseille",
  576: null,          // Strasbourg → r/ligue1 search
  525: null,
  511: null,
  1045: null,
  512: null,
  532: null,
  533: null,
  522: null,
  519: null,
  543: null,
  545: null,
};

// Understat.com team names (for xG/stats scraping)
export const UNDERSTAT_TEAM_MAP: Record<number, string> = {
  524: "PSG",
  548: "Monaco",
  523: "Lyon",
  521: "Lille",
  529: "Rennes",
  516: "Marseille",
  576: "Strasbourg",
  525: "Lorient",
  511: "Toulouse",
  512: "Brest",
  532: "Angers",
  533: "Le_Havre",
  522: "Nice",
  519: "Auxerre",
  543: "Nantes",
  545: "Metz",
  546: "Lens",
};

// Google News RSS search terms per club
export const CLUB_SEARCH_TERMS: Record<number, string> = {
  524: "PSG+Paris+Saint-Germain",
  546: "RC+Lens",
  523: "Olympique+Lyonnais+OL",
  521: "Lille+LOSC",
  529: "Stade+Rennais+Rennes",
  548: "AS+Monaco",
  516: "Olympique+Marseille+OM",
  576: "RC+Strasbourg",
  525: "FC+Lorient",
  511: "Toulouse+FC+TFC",
  1045: "Paris+FC",
  512: "Stade+Brestois+Brest",
  532: "Angers+SCO",
  533: "Le+Havre+HAC",
  522: "OGC+Nice",
  519: "AJ+Auxerre",
  543: "FC+Nantes",
  545: "FC+Metz",
};
