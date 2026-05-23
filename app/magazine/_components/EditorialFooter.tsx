// Editorial footer — the "ours" (masthead-at-the-bottom French press
// convention). Names are deterministic per-issue (recurring contributors
// rotate as Rédac' chef / Culture / Politique foot etc.).

import Link from "next/link";
import type { Issue } from "../_lib/issue";

export default function EditorialFooter({ issue }: { issue: Issue }) {
  const { editorial, issueNumber, formattedDate, dateKey } = issue;
  return (
    <footer style={{ background: "#f1ece1", borderTop: "3px double var(--ink)", marginTop: 32 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 24px 28px" }}>
        <div className="flex items-baseline justify-between" style={{ marginBottom: 18 }}>
          <p className="label label-accent">Ours</p>
          <span className="meta">N°{issueNumber.toString().padStart(3, "0")} · {formattedDate}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 24 }}>
          <div>
            <p className="label label-muted" style={{ fontSize: 10, marginBottom: 4 }}>Directeur de la publication</p>
            <p className="display-medium" style={{ fontSize: 16 }}>{editorial.director}</p>
          </div>
          <div>
            <p className="label label-muted" style={{ fontSize: 10, marginBottom: 4 }}>Rédactrice / Rédacteur en chef</p>
            <p className="display-medium" style={{ fontSize: 16 }}>{editorial.redacChef}</p>
          </div>
          <div>
            <p className="label label-muted" style={{ fontSize: 10, marginBottom: 4 }}>Chef·fe du service Culture foot</p>
            <p className="display-medium" style={{ fontSize: 16 }}>{editorial.chefCulture}</p>
          </div>
          <div>
            <p className="label label-muted" style={{ fontSize: 10, marginBottom: 4 }}>Politique du jeu</p>
            <p className="display-medium" style={{ fontSize: 16 }}>{editorial.chefPolitiqueFoot}</p>
          </div>
        </div>

        <div className="rule-hairline" style={{ margin: "24px 0" }} />

        <div className="flex items-baseline justify-between" style={{ flexWrap: "wrap", gap: 16 }}>
          <div className="meta" style={{ fontSize: 11, maxWidth: 620, lineHeight: 1.6 }}>
            <em>Foot — Le Magazine</em> est une édition quotidienne dérivée de l&apos;app Foot Predictom. Les statistiques en
            direct proviennent de FotMob et football-data.org. Les photos d&apos;archive sont sourcées sur Wikimedia
            Commons. Le contenu éditorial de ce numéro est généré de manière déterministe à partir de la date
            de parution&nbsp;: chaque visiteur du jour lit la même édition.
          </div>
          <div className="flex flex-col items-end" style={{ gap: 6 }}>
            <Link href="/" className="meta" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              ← Retour à l&apos;application
            </Link>
            <Link href={`/magazine/${dateKey}`} className="meta" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Lien permanent de ce numéro →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
