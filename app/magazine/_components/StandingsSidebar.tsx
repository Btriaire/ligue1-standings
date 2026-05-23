// Standings sidebar — "Le classement en bref" block. Fetches top-5 of L1
// and L2 client-side from the existing /api/standings endpoints. Falls
// back to a skeleton if either call fails. Live standings always show
// today's numbers — even in archive issues — which we accept as a "current
// state" insert, consistent with how real newspapers print live league
// tables across re-edits.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Standing {
  position: number;
  team: { name: string; tla?: string };
  points: number;
  playedGames: number;
}

async function fetchTop(competition?: string): Promise<Standing[]> {
  const url = competition ? `/api/standings?competition=${competition}` : "/api/standings";
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const arr: Standing[] = data?.standings ?? [];
    return arr.slice(0, 5);
  } catch {
    return [];
  }
}

function StandingsBlock({ title, rows }: { title: string; rows: Standing[] | null }) {
  return (
    <div>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 10 }}>
        <h4 className="display-medium" style={{ fontSize: 19, margin: 0 }}>{title}</h4>
        <span className="meta" style={{ fontSize: 10 }}>Top 5</span>
      </div>
      <div className="rule-strong" style={{ marginBottom: 8 }} />
      {rows === null ? (
        <p className="meta">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="meta">Indisponible</p>
      ) : (
        <table className="tabular" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {rows.map(r => (
              <tr key={r.team.name} style={{ borderBottom: "1px solid var(--hairline)" }}>
                <td style={{ padding: "8px 4px", color: "var(--ink-muted)", fontWeight: 600, width: 24 }}>{r.position}</td>
                <td style={{ padding: "8px 4px", fontWeight: 600 }}>{r.team.name}</td>
                <td style={{ padding: "8px 4px", textAlign: "right", color: "var(--ink-muted)" }}>{r.playedGames} M</td>
                <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 700 }}>{r.points} pts</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function StandingsSidebar() {
  const [l1, setL1] = useState<Standing[] | null>(null);
  const [l2, setL2] = useState<Standing[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchTop().then(arr => { if (alive) setL1(arr); });
    fetchTop("FL2").then(arr => { if (alive) setL2(arr); });
    return () => { alive = false; };
  }, []);

  return (
    <aside style={{ background: "var(--paper)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px 8px" }}>
        <div className="flex items-baseline justify-between" style={{ marginBottom: 16 }}>
          <div>
            <p className="label label-accent">Tableau de marche</p>
            <h2 className="display-medium" style={{ fontSize: "clamp(26px, 3vw, 32px)", margin: "4px 0 0" }}>
              Le classement, en bref
            </h2>
          </div>
          <Link href="/" className="meta" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Classement complet →
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          <StandingsBlock title="Ligue 1" rows={l1} />
          <StandingsBlock title="Ligue 2" rows={l2} />
        </div>
      </div>
    </aside>
  );
}
