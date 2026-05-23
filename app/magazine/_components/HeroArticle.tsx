// HeroArticle — the "À la Une". Two-column layout: portrait left,
// editorial text right. We fetch the player photo client-side (the
// /api/player-photo route is rate-limited and cached upstream).

"use client";

import { useEffect, useState } from "react";
import type { Issue } from "../_lib/issue";

interface PhotoResponse { imageUrl: string | null; source?: string; label?: string }

async function fetchPhoto(name: string, club: string): Promise<string | null> {
  try {
    const url = `/api/player-photo?name=${encodeURIComponent(name)}&club=${encodeURIComponent(club)}`;
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const data: PhotoResponse = await res.json();
    return data.imageUrl ?? null;
  } catch {
    return null;
  }
}

export default function HeroArticle({ issue }: { issue: Issue }) {
  const { hero } = issue;
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchPhoto(hero.player.name, hero.player.club).then(url => {
      if (alive) setPhotoUrl(url);
    });
    return () => { alive = false; };
  }, [hero.player.name, hero.player.club]);

  return (
    <article style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px 48px" }}>
      {/* Section label */}
      <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
        <span className="chip-categorie accent">À la Une</span>
        <span className="label label-muted">{hero.rubrique}</span>
        <span className="rule-hairline" style={{ flex: 1 }} />
        <span className="meta">Lecture 6 min</span>
      </div>

      <div className="grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1.45fr)", gap: 40, alignItems: "start" }}>
        {/* Portrait (polaroid frame) */}
        <div>
          <div className="portrait-frame" style={{ aspectRatio: "3 / 4" }}>
            <div style={{ width: "100%", height: "100%", background: "#1f1d18", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={hero.player.name} />
              ) : (
                <div style={{ fontSize: 92, lineHeight: 1 }}>{hero.player.flag}</div>
              )}
            </div>
          </div>
          <p className="meta" style={{ marginTop: 12, fontStyle: "italic", fontSize: 11 }}>
            {hero.player.name} sous le maillot de {hero.player.nat}, archive — Crédit&nbsp;: Wikimedia Commons.
          </p>
        </div>

        {/* Text column */}
        <div>
          <p className="label label-accent" style={{ marginBottom: 12 }}>{hero.overline}</p>
          <h2
            className="display"
            style={{ fontSize: "clamp(40px, 5.2vw, 64px)", margin: 0, marginBottom: 18 }}
          >
            {hero.title}
          </h2>

          <div className="flex items-center gap-4" style={{ marginBottom: 18 }}>
            <span className="meta">Par <strong style={{ color: "var(--ink)" }}>{hero.player.byline}</strong></span>
            <span className="rule-accent" />
            <span className="meta">{hero.player.club} · {hero.player.age} ans</span>
          </div>

          <div className="body lead" style={{ fontSize: 17.5, lineHeight: 1.68 }}>
            <p>{hero.chapeau}</p>
          </div>

          <div className="pull-quote">{hero.player.pullQuote}</div>

          <div className="body" style={{ fontSize: 16.5, lineHeight: 1.7, color: "var(--ink-soft)" }}>
            <p>
              <em>Signature&nbsp;:</em> {hero.player.signature.toLowerCase().replace(/^le |^la |^l['']/, "")}. {hero.player.paragraph.split(". ").slice(1).join(". ")}
            </p>
            <p style={{ marginTop: 18 }}>
              Le tournoi commence le 11 juin. D&apos;ici là, le débat tactique attendra. Le débat narratif, lui, est déjà ouvert — et il s&apos;écrit
              dans les colonnes qui suivent.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
