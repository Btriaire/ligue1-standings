// Archive shelf — a horizontally scrollable row of past issues. Each card
// links to /magazine/[date] which re-derives the issue from its date hash.
// The "current" issue is highlighted with the accent border.

import Link from "next/link";
import { recentDates, formatLongDateFr } from "../_lib/issue";

interface Props {
  /** YYYY-MM-DD of the currently-viewed issue, for highlighting. */
  currentKey: string;
  /** Reference date used to build the shelf (usually "today"). */
  referenceDate: Date;
  /** How many past issues to surface (today included). */
  count?: number;
}

export default function ArchiveShelf({ currentKey, referenceDate, count = 18 }: Props) {
  const items = recentDates(referenceDate, count);
  return (
    <section style={{ background: "var(--paper)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 24px" }}>
        <div className="flex items-baseline justify-between" style={{ marginBottom: 14 }}>
          <p className="label label-accent">Archives</p>
          <span className="meta">Les {items.length} derniers numéros</span>
        </div>
        <div className="rule-hairline" style={{ marginBottom: 12 }} />
        <div
          style={{
            display: "grid",
            gridAutoFlow: "column",
            gridAutoColumns: "minmax(140px, 1fr)",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 8,
          }}
        >
          {items.map(({ date, key, issueNumber }) => {
            const active = key === currentKey;
            return (
              <Link
                key={key}
                href={`/magazine/${key}`}
                className="shelf-card"
                style={{
                  borderColor: active ? "var(--accent)" : undefined,
                  boxShadow: active ? "0 1px 0 var(--accent)" : undefined,
                  textAlign: "center",
                  borderBottom: undefined,
                }}
              >
                <div className="label" style={{ fontSize: 9, color: active ? "var(--accent)" : "var(--ink-muted)" }}>
                  N°{issueNumber.toString().padStart(3, "0")}
                </div>
                <div
                  className="display-medium"
                  style={{ fontSize: 18, margin: "4px 0 2px", color: active ? "var(--accent)" : "var(--ink)" }}
                >
                  {date.getDate()}
                </div>
                <div className="meta" style={{ fontSize: 10, textTransform: "lowercase" }}>
                  {formatLongDateFr(date).split(" ").slice(2, 4).join(" ")}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
