// Canonical shapes shared across routes and UI. These mirror the football-data.org
// response envelope after our normalisation passes; vendor-specific shapes
// (FotMob, Transfermarkt, SofaScore, Understat, Datamb) stay local to their
// fetchers in app/lib/*.
//
// Migration rules of thumb:
//   • A route that already declares `{ id; name; shortName; tla; crest }` can
//     drop the inline interface and import `Team` directly.
//   • UI components that only need a subset (e.g. the crest + name for a
//     header) should use `TeamMini` / `TeamRef` rather than re-declaring.
//   • `form` is `string | null` on purpose — football-data.org returns `null`
//     before five matches are played. Consumers pass it through
//     `formScore01()` which already handles null/undefined.

/** Football-data.org team identity. The full shape used everywhere a TLA is
 * available (predictions, standings, live, ESPN-bridged routes). */
export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

/** Minimal team identity used by widgets that only render a crest + a label
 * (e.g. mini scoreboards, mercato banners). */
export type TeamMini = Pick<Team, "id" | "name" | "crest">;

/** Team identity without a TLA — used by routes that bridge FotMob (Ligue 2)
 * where TLA isn't reliably available. */
export type TeamRef = Pick<Team, "id" | "name" | "shortName" | "crest">;

/** Final score with both halves known. Use for live/finished matches once a
 * scoreline is committed. */
export interface FinalScore {
  home: number;
  away: number;
}

/** Score that may be partially or fully unknown — pre-kickoff or postponed
 * matches surface null on both sides. */
export interface Score {
  home: number | null;
  away: number | null;
}

/** A row of the league table. `form` is null until five matches have been
 * played; downstream scoring helpers tolerate that. */
export interface Standing {
  position: number;
  team: Team;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string | null;
}
