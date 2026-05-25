"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Play, Clock } from "@phosphor-icons/react";

const TweetModal = dynamic(() => import("./TweetModal"), { ssr: false });

interface VideoDay {
  url: string;
  poster: string;
  type: "video" | "gif";
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

export default function VideoOfTheDay() {
  const [data,    setData]    = useState<VideoDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/video-of-the-day")
      .then(r => r.ok ? r.json() : null)
      .then((d: { ok?: boolean; video?: VideoDay } | null) => {
        if (!cancelled) {
          setData(d?.ok && d.video ? d.video : null);
          setLoading(false);
        }
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

  return (
    <div className="max-w-5xl mx-auto px-4 mt-3">
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl overflow-hidden transition-all hover:scale-[1.005] active:scale-[0.995]"
        style={{ background: "#0d1421", border: "1px solid rgba(239,68,68,0.25)" }}
      >
        <div className="flex items-stretch gap-3">
          {/* Thumbnail with play overlay */}
          <div className="relative flex-shrink-0"
            style={{ width: 160, height: 100, background: "#0a0f1c" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.poster}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Dark overlay + red play button */}
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.30)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(239,68,68,0.90)",
                  boxShadow: "0 0 18px rgba(239,68,68,0.45)",
                }}>
                <Play size={15} weight="fill" color="#fff" style={{ marginLeft: 2 }}/>
              </div>
            </div>
          </div>

          {/* Caption */}
          <div className="flex-1 min-w-0 py-2 pr-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#ef4444" }}>
                  🎬 Vidéo du jour
                </span>
                <span style={{ color: "#475569", fontSize: 9 }}>·</span>
                <span className="text-[10px] font-bold" style={{ color: "#1da1f2" }}>@{data.author}</span>
              </div>
              <p className="text-[12px] leading-snug line-clamp-2" style={{ color: "#cbd5e1" }}>
                {data.title}
              </p>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: "#6b7c96" }}>
                <Clock size={9}/>
                {timeAgo(data.pubDate)}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: "#ef4444" }}>
                ▶ Lire
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
            media: [{ type: data.type, url: data.url, poster: data.poster }],
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
