"use client";

import React, { useEffect, useState } from "react";

// Recent French-football posts from @ActuFoot_ (X/Twitter), fetched via our
// Nitter proxy in /api/twitter-user. Auto-refresh every 5 minutes — the
// route already caches s-maxage=300 so we won't hammer Nitter.

interface Tweet { id: string; title: string; pubDate: string; url: string; author: string }

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "à l'instant";
  if (d < 3600) return `il y a ${Math.floor(d/60)} min`;
  if (d < 86400) return `il y a ${Math.floor(d/3600)} h`;
  return `il y a ${Math.floor(d/86400)} j`;
}

export default function ActuFootBanner() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/twitter-user?handle=ActuFoot_");
        if (!r.ok) { if (!cancelled) setErrored(true); return; }
        const j = await r.json() as { tweets?: Tweet[]; error?: string };
        if (!cancelled) {
          setTweets(j.tweets ?? []);
          setErrored(!!j.error && (j.tweets ?? []).length === 0);
        }
      } catch { if (!cancelled) setErrored(true); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <div className="border-b" style={{ background: "#0a0f1c", borderColor: "#1a2235" }}>
      <div className="max-w-[1300px] mx-auto px-4 py-2 flex items-center gap-3">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ background: "#1d9bf0", color: "#fff" }}>𝕏 @ActuFoot_</span>
        </div>
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="h-4 rounded animate-pulse" style={{ background: "#0d1421" }}/>
          ) : errored || tweets.length === 0 ? (
            <a href="https://x.com/ActuFoot_" target="_blank" rel="noopener noreferrer"
              className="text-[11px] italic hover:opacity-80" style={{ color: "#64748b" }}>
              Flux temporairement indisponible — voir sur x.com/ActuFoot_
            </a>
          ) : (
            <div className="flex gap-6 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {tweets.slice(0, 8).map(t => (
                <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-baseline gap-2 flex-shrink-0 hover:opacity-80 transition-opacity max-w-[420px]">
                  <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: "#64748b" }}>
                    {timeAgo(t.pubDate)}
                  </span>
                  <span className="text-[11px] truncate" style={{ color: "#cbd5e1" }}>
                    {t.title.replace(/^R to @\w+:\s*/, "").replace(/^RT by @\w+:\s*/, "")}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
