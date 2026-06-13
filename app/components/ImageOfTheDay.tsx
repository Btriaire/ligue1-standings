"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Image as ImageIcon, ArrowSquareOut, Clock } from "@phosphor-icons/react";

const TweetModal = dynamic(() => import("./TweetModal"), { ssr: false });

// Compact "snapshot of the past 24h" surfaced on the homepage.
// Pulls one media-bearing tweet from a rotating pool of high-signal
// accounts (see /api/image-of-the-day) — kept intentionally small
// (~180px tall on mobile, ~220px on desktop) so it doesn't push the
// standings below the fold.

interface ImageDay {
  url: string;
  poster: string | null;
  type: "photo" | "video" | "gif";
  title: string;
  author: string;
  tweetUrl: string;
  pubDate: string;
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600)  return `il y a ${Math.max(1, Math.floor(d / 60))} min`;
  if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`;
  return `il y a ${Math.floor(d / 86400)} j`;
}

export default function ImageOfTheDay() {
  const [data,    setData]    = useState<ImageDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/image-of-the-day")
      .then(r => r.ok ? r.json() : null)
      .then((d: { ok?: boolean; image?: ImageDay } | null) => {
        if (cancelled) return;
        setData(d?.ok && d.image ? d.image : null);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 mt-3">
        <div className="h-24 rounded-xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}/>
      </div>
    );
  }
  if (!data) return null;

  const thumb = data.type === "photo" ? data.url : (data.poster ?? data.url);

  return (
    <div className="max-w-5xl mx-auto px-4 mt-3">
      <button onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl overflow-hidden transition-all hover:scale-[1.005] active:scale-[0.995]"
        style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
        <div className="flex items-stretch gap-3">
          {/* Thumbnail — responsive width, never too big */}
          <div className="relative flex-shrink-0"
            style={{ width: "clamp(100px, 38vw, 160px)", aspectRatio: "16/10", background: "#0a0f1c" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt=""
              className="w-full h-full object-cover"
              loading="lazy"/>
            {data.type !== "photo" && (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.35)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <span className="text-white text-sm" style={{ marginLeft: 2 }}>▶</span>
                </div>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="flex-1 min-w-0 py-2 pr-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <ImageIcon size={13} weight="fill" style={{ color: "#fbbf24" }}/>
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#fbbf24" }}>
                  Image du jour
                </span>
                <span className="text-[9px]" style={{ color: "#475569" }}>·</span>
                <span className="text-[10px] font-bold" style={{ color: "#1da1f2" }}>@{data.author}</span>
              </div>
              <p className="text-[12px] leading-snug line-clamp-2" style={{ color: "#cbd5e1" }}>
                {data.title}
              </p>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: "#6b7c96" }}>
                <Clock size={11}/>
                {timeAgo(data.pubDate)}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: "#1da1f2" }}>
                Voir <ArrowSquareOut size={11}/>
              </span>
            </div>
          </div>
        </div>
      </button>

      {open && (
        <TweetModal
          tweet={{
            id: data.tweetUrl,
            title: data.title,
            pubDate: data.pubDate,
            url: data.tweetUrl,
            author: data.author,
            media: [{ type: data.type, url: data.url, poster: data.poster ?? undefined }],
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
