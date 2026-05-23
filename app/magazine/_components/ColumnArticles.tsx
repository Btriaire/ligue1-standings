// Three-column block under the hero: pronostic / portrait / agenda TV.
// Reads the issue object (deterministic) for headlines+bylines; the TV
// block fetches actual upcoming fixtures from /api/tv at render time
// (client component) so the agenda reflects today's reality.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Issue } from "../_lib/issue";
import { fmtTime, fmtDayMonth } from "@/app/lib/format";

interface TvMatch {
  id: string | number;
  utcDate: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
}
interface TvResponse {
  l1?: TvMatch[];
  l2?: TvMatch[];
  cdm?: TvMatch[];
}

function ColumnHeader({ rubrique, title, byline, minutes }: { rubrique: string; title: string; byline: string; minutes?: number }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="label label-accent" style={{ marginBottom: 8 }}>{rubrique}</div>
      <h3 className="display-medium" style={{ fontSize: "clamp(22px, 2.6vw, 30px)", margin: 0, marginBottom: 10 }}>
        {title}
      </h3>
      <div className="flex items-center gap-2">
        <span className="meta" style={{ fontSize: 11 }}>Par <strong style={{ color: "var(--ink)" }}>{byline}</strong></span>
        {typeof minutes === "number" && (
          <>
            <span className="meta">·</span>
            <span className="meta" style={{ fontSize: 11 }}>Lecture {minutes} min</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function ColumnArticles({ issue }: { issue: Issue }) {
  const { prono, portrait, tv } = issue;
  const [matches, setMatches] = useState<TvMatch[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/tv", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then((data: TvResponse | null) => {
        if (!alive || !data) return;
        const merged = [
          ...(data.l1 ?? []),
          ...(data.cdm ?? []),
          ...(data.l2 ?? []),
        ];
        const upcoming = merged
          .filter(m => new Date(m.utcDate).getTime() > Date.now() - 60 * 60 * 1000)
          .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
          .slice(0, 4);
        setMatches(upcoming);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <section style={{ background: "var(--paper)" }}>
      <div className="mag-gutter" style={{ maxWidth: 1180, margin: "0 auto", padding: "8px 0 40px" }}>
        <div className="rule-strong" style={{ marginBottom: 24 }} />
        <div className="mag-grid-cols3">
          {/* Pronostic */}
          <article style={{ paddingRight: 12 }} className="col-divider-r">
            <ColumnHeader rubrique={prono.rubrique} title={prono.title} byline={prono.byline} minutes={prono.minutes} />
            <div className="body" style={{ fontSize: 14.5, lineHeight: 1.68 }}>
              <p>{prono.body}</p>
              <p style={{ marginTop: 10, color: "var(--ink-muted)", fontStyle: "italic" }}>
                Lire l&apos;analyse complète dans <Link href="/">l&apos;onglet Pronostics</Link>.
              </p>
            </div>
          </article>

          {/* Portrait */}
          <article style={{ padding: "0 12px" }} className="col-divider">
            <ColumnHeader rubrique="PORTRAIT" title={portrait.title} byline={portrait.byline} minutes={portrait.minutes} />
            <div className="flex items-start gap-3" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 42, lineHeight: 1 }}>{portrait.player.flag}</div>
              <div>
                <p className="display-medium" style={{ fontSize: 18, margin: 0 }}>{portrait.player.name}</p>
                <p className="meta" style={{ fontSize: 11 }}>{portrait.player.club} · {portrait.player.age} ans</p>
              </div>
            </div>
            <div className="body" style={{ fontSize: 14.5, lineHeight: 1.65 }}>
              <p>{portrait.player.paragraph}</p>
            </div>
            <p className="meta" style={{ marginTop: 12, fontSize: 11, fontStyle: "italic" }}>
              « {portrait.player.signature.replace(/^Le |^La |^L['']/, "")} » — {portrait.player.byline}
            </p>
          </article>

          {/* Agenda TV */}
          <article style={{ paddingLeft: 12 }} className="col-divider">
            <ColumnHeader rubrique={tv.rubrique} title={tv.title} byline={tv.byline} />
            {matches === null ? (
              <p className="meta">Chargement de l&apos;agenda…</p>
            ) : matches.length === 0 ? (
              <p className="meta">Pas de match programmé dans les prochains jours.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {matches.map(m => (
                  <li key={m.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--hairline)" }}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="label label-accent" style={{ fontSize: 10 }}>
                        {fmtDayMonth(m.utcDate)} · {fmtTime(m.utcDate)}
                      </span>
                    </div>
                    <p className="display-medium" style={{ fontSize: 16, margin: "4px 0 0", lineHeight: 1.25 }}>
                      {m.homeTeam.name} <span style={{ color: "var(--ink-muted)" }}>—</span> {m.awayTeam.name}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="meta" style={{ marginTop: 12, fontSize: 11 }}>
              Programme complet et chaînes&nbsp;: <Link href="/">onglet TV</Link>.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
