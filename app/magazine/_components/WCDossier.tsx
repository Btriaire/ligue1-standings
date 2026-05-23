// WC Dossier — three editorial mini-articles framed as a "Dossier Route to
// USA 2026". Each story has a rubrique, byline and teaser; deterministic
// per-issue. The layout mimics a real Sunday magazine dossier — one big
// lead story, two stacked sidebars.

import Link from "next/link";
import type { Issue } from "../_lib/issue";

interface Story { rubrique: string; title: string; teaser: string; byline: string }

function StoryLead({ story }: { story: Story }) {
  return (
    <article>
      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        <span className="chip-categorie">{story.rubrique}</span>
        <span className="meta">Lecture 5 min</span>
      </div>
      <h3 className="display" style={{ fontSize: "clamp(28px, 3.6vw, 42px)", margin: 0, marginBottom: 12 }}>
        {story.title}
      </h3>
      <div className="body" style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)" }}>
        <p>{story.teaser}</p>
      </div>
      <p className="meta" style={{ marginTop: 14 }}>Par <strong style={{ color: "var(--ink)" }}>{story.byline}</strong></p>
    </article>
  );
}

function StorySidebar({ story }: { story: Story }) {
  return (
    <article style={{ paddingBottom: 18, borderBottom: "1px solid var(--hairline)" }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
        <span className="chip-categorie">{story.rubrique}</span>
      </div>
      <h4 className="display-medium" style={{ fontSize: 20, margin: 0, marginBottom: 6 }}>
        {story.title}
      </h4>
      <p className="body" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-soft)" }}>
        {story.teaser}
      </p>
      <p className="meta" style={{ marginTop: 8, fontSize: 11 }}>Par {story.byline}</p>
    </article>
  );
}

export default function WCDossier({ issue }: { issue: Issue }) {
  const { dossier } = issue;
  return (
    <section style={{ background: "var(--paper)", borderTop: "3px double var(--ink)", borderBottom: "3px double var(--ink)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px" }}>
        <div className="flex items-baseline justify-between" style={{ marginBottom: 24 }}>
          <div>
            <p className="label label-accent">Dossier</p>
            <h2 className="display" style={{ fontSize: "clamp(36px, 5vw, 56px)", margin: 0, marginTop: 4 }}>
              Route to USA 2026
            </h2>
          </div>
          <Link href="/" className="meta" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Onglet CdM →
          </Link>
        </div>

        <div className="rule-accent" style={{ marginBottom: 28 }} />

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1fr)", gap: 40 }}>
          <StoryLead story={dossier.storyA} />
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <StorySidebar story={dossier.storyB} />
            <StorySidebar story={dossier.storyC} />
          </div>
        </div>
      </div>
    </section>
  );
}
