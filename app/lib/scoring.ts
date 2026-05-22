// Shared scoring primitives used by predictions (server route, predictions
// tab, club page mini-prediction). Kept tiny on purpose — algorithms that
// diverge in tuning (PredictionsTab's `teamStrengthClient`, MonClubTab's
// 0-100 variant) stay local so behavior changes there don't ripple across
// the app.

/**
 * Form score in [0..1]. `form` is a comma-separated trail like "W,W,D,L,W".
 * Only the last five results count. Empty/missing form returns 0.4 — a
 * deliberately neutral-but-slightly-pessimistic baseline that matches the
 * historical behavior of every caller we consolidated.
 */
export function formScore01(form: string | null | undefined): number {
  if (!form) return 0.4;
  const r = form.split(",").filter(Boolean).slice(-5);
  if (r.length === 0) return 0.4;
  const pts = r.reduce((a, x) => a + (x === "W" ? 3 : x === "D" ? 1 : 0), 0);
  return pts / (r.length * 3);
}

/**
 * Form momentum: how much the last 3 differ from the last 5. Capped at ±0.12
 * so it acts as a nudge, not a swing. Returns 0 when fewer than 3 results.
 */
export function formMomentum(form: string | null | undefined): number {
  if (!form) return 0;
  const results = form.split(",").filter(Boolean);
  if (results.length < 3) return 0;
  const ppg = (rs: string[]) =>
    rs.length === 0 ? 0 : rs.reduce((a, r) => a + (r === "W" ? 3 : r === "D" ? 1 : 0), 0) / (rs.length * 3);
  return (ppg(results.slice(-3)) - ppg(results.slice(-5))) * 0.12;
}
