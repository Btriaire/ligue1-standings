// Shared lineup formations used by both Mon Club (L1/L2) and the World Cup
// "Ma Compo" surfaces. Keeping them in one place means the pitch layout
// stays identical across the app.

export type FKey = "4-3-3" | "4-2-3-1" | "4-4-2" | "3-5-2" | "5-3-2" | "4-1-4-1";

export interface Slot {
  role: string;             // short label shown on the pitch (GB / DC / MC / AT …)
  type: "GK" | "DF" | "MF" | "FW";
  x: number;                // 0–100 horizontal position (% of pitch width)
  y: number;                // 0–100 vertical   position (% of pitch height, 0 = top = opp goal)
}

export const FORMATIONS: Record<FKey, Slot[]> = {
  "4-3-3": [
    { role: "GB",  type: "GK", x: 50, y: 88 }, { role: "DD", type: "DF", x: 82, y: 70 }, { role: "DC", type: "DF", x: 60, y: 72 },
    { role: "DC",  type: "DF", x: 40, y: 72 }, { role: "DG", type: "DF", x: 18, y: 70 }, { role: "MD", type: "MF", x: 72, y: 49 },
    { role: "MC",  type: "MF", x: 50, y: 45 }, { role: "MG", type: "MF", x: 28, y: 49 }, { role: "AD", type: "FW", x: 80, y: 20 },
    { role: "AT",  type: "FW", x: 50, y: 12 }, { role: "AG", type: "FW", x: 20, y: 20 },
  ],
  "4-2-3-1": [
    { role: "GB",  type: "GK", x: 50, y: 88 }, { role: "DD",  type: "DF", x: 82, y: 73 }, { role: "DC",  type: "DF", x: 60, y: 75 },
    { role: "DC",  type: "DF", x: 40, y: 75 }, { role: "DG",  type: "DF", x: 18, y: 73 }, { role: "MDC", type: "MF", x: 63, y: 58 },
    { role: "MDC", type: "MF", x: 37, y: 58 }, { role: "MD",  type: "MF", x: 78, y: 37 }, { role: "MAC", type: "MF", x: 50, y: 35 },
    { role: "MG",  type: "MF", x: 22, y: 37 }, { role: "AT",  type: "FW", x: 50, y: 13 },
  ],
  "4-4-2": [
    { role: "GB",  type: "GK", x: 50, y: 88 }, { role: "DD",  type: "DF", x: 82, y: 71 }, { role: "DC",  type: "DF", x: 60, y: 73 },
    { role: "DC",  type: "DF", x: 40, y: 73 }, { role: "DG",  type: "DF", x: 18, y: 71 }, { role: "MD",  type: "MF", x: 78, y: 48 },
    { role: "MC",  type: "MF", x: 57, y: 50 }, { role: "MC",  type: "MF", x: 43, y: 50 }, { role: "MG",  type: "MF", x: 22, y: 48 },
    { role: "ATD", type: "FW", x: 65, y: 18 }, { role: "ATG", type: "FW", x: 35, y: 18 },
  ],
  "3-5-2": [
    { role: "GB",  type: "GK", x: 50, y: 88 }, { role: "DC",  type: "DF", x: 72, y: 73 }, { role: "DC",  type: "DF", x: 50, y: 75 },
    { role: "DC",  type: "DF", x: 28, y: 73 }, { role: "PD",  type: "MF", x: 87, y: 52 }, { role: "MD",  type: "MF", x: 68, y: 49 },
    { role: "MC",  type: "MF", x: 50, y: 47 }, { role: "MG",  type: "MF", x: 32, y: 49 }, { role: "PG",  type: "MF", x: 13, y: 52 },
    { role: "ATD", type: "FW", x: 65, y: 16 }, { role: "ATG", type: "FW", x: 35, y: 16 },
  ],
  "5-3-2": [
    { role: "GB",  type: "GK", x: 50, y: 88 }, { role: "LD",  type: "DF", x: 87, y: 71 }, { role: "DC",  type: "DF", x: 69, y: 74 },
    { role: "DC",  type: "DF", x: 50, y: 75 }, { role: "DC",  type: "DF", x: 31, y: 74 }, { role: "LG",  type: "DF", x: 13, y: 71 },
    { role: "MD",  type: "MF", x: 72, y: 49 }, { role: "MC",  type: "MF", x: 50, y: 46 }, { role: "MG",  type: "MF", x: 28, y: 49 },
    { role: "ATD", type: "FW", x: 66, y: 17 }, { role: "ATG", type: "FW", x: 34, y: 17 },
  ],
  "4-1-4-1": [
    { role: "GB",  type: "GK", x: 50, y: 88 }, { role: "DD",  type: "DF", x: 82, y: 74 }, { role: "DC",  type: "DF", x: 60, y: 75 },
    { role: "DC",  type: "DF", x: 40, y: 75 }, { role: "DG",  type: "DF", x: 18, y: 74 }, { role: "MDC", type: "MF", x: 50, y: 61 },
    { role: "MD",  type: "MF", x: 80, y: 44 }, { role: "MC",  type: "MF", x: 60, y: 42 }, { role: "MC",  type: "MF", x: 40, y: 42 },
    { role: "MG",  type: "MF", x: 20, y: 44 }, { role: "AT",  type: "FW", x: 50, y: 13 },
  ],
};

export const F_KEYS = Object.keys(FORMATIONS) as FKey[];
