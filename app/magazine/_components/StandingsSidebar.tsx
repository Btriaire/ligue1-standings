// Standings sidebar — "Le classement complet". Fetches both L1 and L2
// standings client-side from the existing /api/standings endpoints, then
// renders a richer editorial treatment than a plain top-5 table:
//   • Leader spotlight card with the gap to second
//   • Top-10 "Tableau de marche complet" table with form column
//   • Relegation watch row showing the bottom 3 in red
// Live standings always show today's numbers — even in archive issues —
// which we accept as a "current state" insert, consistent with how real
// newspapers print live league tables across re-edits.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Standing {
  position: number;
  team: { name: string; tla?: string };
  points: number;
  playedGames: number;
  won?: number;
  draw?: number;
  lost?: number;
  goalDifference?: number;
  form?: string | null;
}

async function fetchAll(competition?: string): Promise<Standing[]> {
  const url = competition ? `/api/standings?competition=${competition}` : "/api/standings";
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.standings ?? []) as Standing[];
  } catch {
    return [];
  }
}

/** Convert a stored form string (oldest→newest, comma-separated like
 *  "W,D,L,W,W") into individual letter pills. Tolerates null/empty. */
function FormPills({ form }: { form: string | null | undefined }) {
  if (!form) return <span className="meta" style={{ fontSize: 10 }}>—</span>;
  const letters = form.split(",").map(s => s.trim()).filter(Boolean).slice(-5);
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {letters.map((l, i) => {
        const color = l === "W" ? "var(--accent)" : l === "L" ? "var(--ink-muted)" : "var(--ink-soft)";
        return (
          <span
            key={i}
            className="tabular"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 16, height: 16,
              fontSize: 9, fontWeight: 700,
              border: `1px solid ${color}`,
              color,
              borderRadius: 2,
              lineHeight: 1,
            }}
          >
            {l}
          </span>
        );
      })}
    </span>
  );
}

function LeaderSpotlight({ rows, label }: { rows: Standing[]; label: string }) {
  if (rows.length < 2) return null;
  const [leader, second] = rows;
  const gap = leader.points - second.points;
  return (
    <div className="leader-card">
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="label label-accent" style={{ fontSize: 9, marginBottom: 4 }}>
          Leader {label}
        </div>
        <div className="display-medium" style={{ fontSize: 22, lineHeight: 1.1 }}>
          {leader.team.name}
        </div>
        <div className="meta" style={{ fontSize: 11, marginTop: 4 }}>
          {gap === 0
            ? `À égalité avec ${second.team.name}`
            : `+${gap} pt${gap > 1 ? "s" : ""} sur ${second.team.name}`}
          {typeof leader.goalDifference === "number" && ` · diff ${leader.goalDifference > 0 ? "+" : ""}${leader.goalDifference}`}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="leader-pts">{leader.points}</div>
        <div className="meta" style={{ fontSize: 10 }}>pts en {leader.playedGames} m.</div>
      </div>
    </div>
  );
}

function StandingsBlock({ title, rows }: { title: string; rows: Standing[] | null }) {
  if (rows === null) {
    return (
      <div>
        <div className="flex items-baseline justify-between" style={{ marginBottom: 10 }}>
          <h4 className="display-medium" style={{ fontSize: 20, margin: 0 }}>{title}</h4>
        </div>
        <div className="rule-strong" style={{ marginBottom: 8 }} />
        <p className="meta">Chargement…</p>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div>
        <div className="flex items-baseline justify-between" style={{ marginBottom: 10 }}>
          <h4 className="display-medium" style={{ fontSize: 20, margin: 0 }}>{title}</h4>
        </div>
        <div className="rule-strong" style={{ marginBottom: 8 }} />
        <p className="meta">Indisponible</p>
      </div>
    );
  }

  const top10 = rows.slice(0, 10);
  // Relegation watch: last 3 of the table (positions 18/19/20 in L1,
  // 18/19/20 in L2). The API returns all teams, so we pick from the tail.
  const danger = rows.slice(-3);

  return (
    <div>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 10 }}>
        <h4 className="display-medium" style={{ fontSize: 20, margin: 0 }}>{title}</h4>
        <span className="meta" style={{ fontSize: 10 }}>Top 10 · {rows.length} clubs</span>
      </div>
      <div className="rule-strong" style={{ marginBottom: 8 }} />

      <LeaderSpotlight rows={rows} label={title} />

      <div style={{ overflowX: "auto" }}>
        <table className="tabular" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--hairline-strong)" }}>
              <th style={{ textAlign: "left", padding: "6px 4px", width: 24, fontSize: 10, color: "var(--ink-muted)", fontWeight: 600 }}>#</th>
              <th style={{ textAlign: "left", padding: "6px 4px", fontSize: 10, color: "var(--ink-muted)", fontWeight: 600 }}>Club</th>
              <th style={{ textAlign: "right", padding: "6px 4px", fontSize: 10, color: "var(--ink-muted)", fontWeight: 600 }}>J</th>
              <th style={{ textAlign: "right", padding: "6px 4px", fontSize: 10, color: "var(--ink-muted)", fontWeight: 600 }}>Diff</th>
              <th className="mag-hide-mobile" style={{ textAlign: "left", padding: "6px 4px", fontSize: 10, color: "var(--ink-muted)", fontWeight: 600 }}>Forme</th>
              <th style={{ textAlign: "right", padding: "6px 4px", fontSize: 10, color: "var(--ink-muted)", fontWeight: 600 }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {top10.map(r => {
              // Highlight podium positions with a faint background.
              const podium = r.position <= 3;
              const gd = typeof r.goalDifference === "number" ? r.goalDifference : 0;
              return (
                <tr
                  key={r.team.name}
                  style={{
                    borderBottom: "1px solid var(--hairline)",
                    background: podium ? "rgba(215, 38, 56, 0.03)" : undefined,
                  }}
                >
                  <td style={{ padding: "7px 4px", color: podium ? "var(--accent)" : "var(--ink-muted)", fontWeight: 700, width: 24 }}>
                    {r.position}
                  </td>
                  <td style={{ padding: "7px 4px", fontWeight: 600, minWidth: 0 }}>
                    <span style={{ display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.team.name}
                    </span>
                  </td>
                  <td style={{ padding: "7px 4px", textAlign: "right", color: "var(--ink-muted)" }}>{r.playedGames}</td>
                  <td style={{ padding: "7px 4px", textAlign: "right", color: gd > 0 ? "var(--accent)" : gd < 0 ? "var(--ink-muted)" : "var(--ink-soft)" }}>
                    {gd > 0 ? "+" : ""}{gd}
                  </td>
                  <td className="mag-hide-mobile" style={{ padding: "7px 4px" }}>
                    <FormPills form={r.form} />
                  </td>
                  <td style={{ padding: "7px 4px", textAlign: "right", fontWeight: 800 }}>{r.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Relegation watch */}
      <div style={{ marginTop: 14 }}>
        <div className="label label-accent" style={{ fontSize: 9, marginBottom: 6 }}>
          Veille de relégation
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {danger.map(r => (
            <li
              key={r.team.name}
              className="flex items-baseline justify-between"
              style={{ padding: "4px 0", borderBottom: "1px dotted var(--hairline)", fontSize: 12 }}
            >
              <span>
                <span className="tabular" style={{ color: "var(--accent)", fontWeight: 700, marginRight: 8 }}>
                  {r.position}
                </span>
                <span style={{ fontWeight: 600 }}>{r.team.name}</span>
              </span>
              <span className="tabular meta" style={{ fontSize: 11 }}>
                {r.points} pts · {r.playedGames} m.
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function StandingsSidebar() {
  const [l1, setL1] = useState<Standing[] | null>(null);
  const [l2, setL2] = useState<Standing[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchAll().then(arr => { if (alive) setL1(arr); });
    fetchAll("FL2").then(arr => { if (alive) setL2(arr); });
    return () => { alive = false; };
  }, []);

  return (
    <aside style={{ background: "var(--paper)" }}>
      <div className="mag-gutter" style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 0 8px" }}>
        <div className="flex items-baseline justify-between" style={{ marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
          <div>
            <p className="label label-accent">Tableau de marche</p>
            <h2 className="display-medium" style={{ fontSize: "clamp(26px, 3vw, 32px)", margin: "4px 0 0" }}>
              Le classement complet
            </h2>
            <p className="meta" style={{ marginTop: 6, fontSize: 12, fontStyle: "italic" }}>
              Top 10 par championnat, forme sur les 5 dernières journées, veille de relégation.
            </p>
          </div>
          <Link href="/" className="meta" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Classement intégral →
          </Link>
        </div>

        <div className="rule-accent" style={{ marginBottom: 20 }} />

        <div className="mag-grid-standings">
          <StandingsBlock title="Ligue 1" rows={l1} />
          <StandingsBlock title="Ligue 2" rows={l2} />
        </div>
      </div>
    </aside>
  );
}
