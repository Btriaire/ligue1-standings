// Issue navigation — prev / next chevrons that link to sibling issues.
// Used inside the archive page; the today page does not show "next"
// since there isn't one yet.

import Link from "next/link";
import { formatLongDateFr, parseYmd, siblingDates } from "../_lib/issue";

interface Props {
  dateKey: string;
  /** "Now" reference passed in from the page (server). We avoid reading
   *  Date.now() during render so the component stays pure under React 19. */
  referenceDate: Date;
  hasNext?: boolean;
}

export default function IssueNavigation({ dateKey, referenceDate, hasNext = true }: Props) {
  const date = parseYmd(dateKey);
  if (!date) return null;
  const { prev, next } = siblingDates(date);
  const prevDate = prev ? parseYmd(prev) : null;
  const nextDate = next ? parseYmd(next) : null;
  const nowMs = referenceDate.getTime();

  return (
    <nav style={{ background: "var(--paper)", borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)" }}>
      <div
        style={{
          maxWidth: 1180, margin: "0 auto", padding: "12px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}
      >
        <div style={{ flex: 1 }}>
          {prev && prevDate ? (
            <Link href={`/magazine/${prev}`} style={{ display: "block" }}>
              <span className="label label-muted">← Numéro précédent</span>
              <p className="display-medium" style={{ fontSize: 15, margin: 0, marginTop: 2 }}>
                {formatLongDateFr(prevDate)}
              </p>
            </Link>
          ) : (
            <span className="meta">Aucun numéro plus ancien.</span>
          )}
        </div>

        <div style={{ flex: 1, textAlign: "right" }}>
          {hasNext && next && nextDate && nextDate.getTime() <= nowMs ? (
            <Link href={`/magazine/${next}`} style={{ display: "block" }}>
              <span className="label label-muted">Numéro suivant →</span>
              <p className="display-medium" style={{ fontSize: 15, margin: 0, marginTop: 2 }}>
                {formatLongDateFr(nextDate)}
              </p>
            </Link>
          ) : (
            <Link href="/magazine" style={{ display: "block" }}>
              <span className="label label-accent">Numéro du jour →</span>
              <p className="display-medium" style={{ fontSize: 15, margin: 0, marginTop: 2 }}>
                Aujourd&apos;hui
              </p>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
