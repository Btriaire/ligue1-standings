// Client-side prediction history stored in localStorage

export interface SavedPrediction {
  matchId: number;
  savedAt: string;       // ISO date when saved
  matchDate: string;     // ISO date of the match
  matchday: number;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  prediction: {
    homeProb: number;
    drawProb: number;
    awayProb: number;
    winner: "home" | "draw" | "away";
    confidence: "high" | "medium" | "low";
    homeXG: number;
    awayXG: number;
  };
  emotional?: {
    homeScore: number;
    awayScore: number;
    applied: boolean;
  };
}

const STORE_KEY = "footpredictom_predictions_v1";
const MAX_ENTRIES = 500;

export function loadPredictions(): SavedPrediction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePredictions(preds: SavedPrediction[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = preds.slice(-MAX_ENTRIES);
    localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function upsertPrediction(pred: SavedPrediction): void {
  const existing = loadPredictions();
  const idx = existing.findIndex((p) => p.matchId === pred.matchId);
  if (idx >= 0) {
    existing[idx] = pred;
  } else {
    existing.push(pred);
  }
  savePredictions(existing);
}

export function getPredictionForMatch(matchId: number): SavedPrediction | null {
  return loadPredictions().find((p) => p.matchId === matchId) ?? null;
}

export function exportToCSV(): string {
  const preds = loadPredictions();
  if (preds.length === 0) return "";

  const header = [
    "Match ID",
    "Date match",
    "Journée",
    "Sauvegardé le",
    "Domicile",
    "Extérieur",
    "Prob Dom (%)",
    "Prob Nul (%)",
    "Prob Ext (%)",
    "Vainqueur prédit",
    "Confiance",
    "xG Dom",
    "xG Ext",
    "Score émot. dom.",
    "Score émot. ext.",
    "Correction émot. appliquée",
  ].join(";");

  const rows = preds.map((p) =>
    [
      p.matchId,
      new Date(p.matchDate).toLocaleString("fr-FR"),
      p.matchday,
      new Date(p.savedAt).toLocaleString("fr-FR"),
      `"${p.homeTeam.name}"`,
      `"${p.awayTeam.name}"`,
      p.prediction.homeProb,
      p.prediction.drawProb,
      p.prediction.awayProb,
      p.prediction.winner === "home"
        ? p.homeTeam.shortName || p.homeTeam.tla
        : p.prediction.winner === "away"
        ? p.awayTeam.shortName || p.awayTeam.tla
        : "Nul",
      p.prediction.confidence === "high"
        ? "Élevée"
        : p.prediction.confidence === "medium"
        ? "Moyenne"
        : "Faible",
      p.prediction.homeXG,
      p.prediction.awayXG,
      p.emotional?.homeScore ?? "",
      p.emotional?.awayScore ?? "",
      p.emotional?.applied ? "Oui" : "Non",
    ].join(";")
  );

  return [header, ...rows].join("\n");
}

export function downloadCSV(): void {
  const csv = exportToCSV();
  if (!csv) return;
  // BOM for Excel UTF-8
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `foot-predictom-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
