// Masthead — the top of every issue. Sets the publication "voice": title,
// tagline, date and issue number. Behaves like a real newspaper nameplate:
// strong typographic hierarchy, no nav links inside (those live in the
// archive bar below).

import Link from "next/link";

interface Props {
  issueNumber: number;
  formattedDate: string;
  tagline: string;
}

export default function Masthead({ issueNumber, formattedDate, tagline }: Props) {
  return (
    <header className="paper-grain" style={{ paddingTop: 24, paddingBottom: 16 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
        {/* Top rail: small left meta, right meta */}
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <span className="meta">Édition n°{issueNumber.toString().padStart(3, "0")} · 1,00 €</span>
          <div className="flex items-center gap-3">
            <span className="meta">{formattedDate}</span>
            <Link href="/" className="meta" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
              ← Retour à l&apos;app
            </Link>
          </div>
        </div>

        <div className="rule-strong" />

        {/* Nameplate */}
        <div style={{ paddingTop: 10, paddingBottom: 10, textAlign: "center" }}>
          <div className="label label-accent" style={{ marginBottom: 6 }}>Le Quotidien du Foot</div>
          <h1
            className="display"
            style={{ fontSize: "clamp(48px, 8.5vw, 96px)", letterSpacing: "-0.025em", margin: 0 }}
          >
            FOOT — Le Magazine
          </h1>
          <p
            className="meta"
            style={{ marginTop: 8, fontSize: 13, fontStyle: "italic", letterSpacing: 0 }}
          >
            {tagline}
          </p>
        </div>

        <div className="rule-double" />
      </div>
    </header>
  );
}
