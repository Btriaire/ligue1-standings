"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut, ArrowsClockwise, Warning, Clock } from "@phosphor-icons/react";
import type { ArticleData } from "@/app/api/news/article/route";
import ModalShell from "./ModalShell";

interface Props {
  title: string;
  url: string;
  pubDate?: string;
  onClose: () => void;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `Il y a ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.round(diff / 3600)}h`;
  return `Il y a ${Math.round(diff / 86400)} j`;
}

export default function NewsModal({ title, url, pubDate, onClose }: Props) {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch article content
  useEffect(() => {
    if (!url) { setError(true); setLoading(false); return; }
    fetch(`/api/news/article?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(true); }
        else { setArticle(d as ArticleData); }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [url]);

  const displayTitle = article?.title || title;
  const paragraphs = article?.body
    ? article.body.split("\n\n").filter(p => p.trim().length > 0)
    : [];

  return (
    <ModalShell
      onClose={onClose}
      maxWidth="sm:max-w-2xl"
      backdrop="rgba(4,7,13,0.88)"
      blur
      maxHeight="92dvh"
    >
      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1">
        {/* Hero image */}
        {article?.image && !error && (
          <div className="relative w-full" style={{ height: 200 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.image}
              alt=""
              className="w-full h-full object-cover"
              onError={e => (e.currentTarget.style.display = "none")}
            />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(to bottom, rgba(13,20,33,0) 40%, rgba(13,20,33,1))"
            }} />
          </div>
        )}

        <div className="px-5 pt-5 pb-8 space-y-4">
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            {article?.sourceDomain && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}>
                {article.sourceDomain}
              </span>
            )}
            {(pubDate || article?.publishedAt) && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "#475569" }}>
                <Clock size={9} />
                {timeAgo(article?.publishedAt ?? pubDate ?? "")}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-lg font-black leading-snug" style={{ color: "#e8edf5", paddingRight: 32 }}>
            {displayTitle}
          </h1>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <ArrowsClockwise size={20} className="animate-spin" style={{ color: "#3b82f6" }} />
              <p className="text-xs" style={{ color: "#6b7c96" }}>Chargement de l&apos;article…</p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="rounded-2xl p-5 flex flex-col items-center gap-3 text-center"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <Warning size={20} style={{ color: "#f87171" }} />
              <p className="text-sm font-semibold" style={{ color: "#e8edf5" }}>
                Article inaccessible depuis notre serveur
              </p>
              <p className="text-xs" style={{ color: "#6b7c96" }}>
                Ce site bloque la lecture automatisée. Ouvre l&apos;article directement.
              </p>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
                style={{ background: "#3b82f6", color: "#fff" }}>
                <ArrowSquareOut size={13} /> Lire sur le site source
              </a>
            </div>
          )}

          {/* Description lead */}
          {!loading && !error && article?.description && (
            <p className="text-sm font-medium leading-relaxed" style={{ color: "#94a3b8" }}>
              {article.description}
            </p>
          )}

          {/* Body paragraphs */}
          {!loading && !error && paragraphs.length > 0 && (
            <div className="space-y-3">
              <div className="w-8 h-px" style={{ background: "#1e2d42" }} />
              {paragraphs.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed" style={{ color: i === 0 ? "#c8d4e0" : "#8a9bb0" }}>
                  {p}
                </p>
              ))}
            </div>
          )}

          {/* Read more button */}
          {!loading && !error && article?.sourceUrl && (
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold hover:opacity-80 transition-opacity mt-2"
              style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa" }}
            >
              <ArrowSquareOut size={14} />
              Lire l&apos;article complet
            </a>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
