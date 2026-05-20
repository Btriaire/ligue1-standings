"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ArrowSquareOut, TwitterLogo, Clock } from "@phosphor-icons/react";

export interface TweetMedia {
  type: "photo" | "video" | "gif";
  url: string;
  poster?: string;
  width?: number;
  height?: number;
}

interface Props {
  tweet: {
    id: string; title: string; pubDate: string; url: string; author: string;
    media?: TweetMedia[];
  };
  onClose: () => void;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `Il y a ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.round(diff / 3600)} h`;
  return `Il y a ${Math.round(diff / 86400)} j`;
}

// In-app reader for a single tweet. We already have the full text in
// our tweet payload (from syndication), so this stays simple — no extra
// network call. The "Voir sur X" link is provided for users who want
// to interact (like/reply/retweet).
export default function TweetModal({ tweet, onClose }: Props) {
  // Lock scroll + ESC to close
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Linkify URLs + #hashtags + @mentions
  const renderRich = (text: string) => {
    const parts = text.split(/(https?:\/\/\S+|#\w+|@\w+)/g);
    return parts.map((p, i) => {
      if (/^https?:\/\//.test(p)) {
        return <a key={i} href={p} target="_blank" rel="noopener noreferrer"
          className="hover:underline" style={{ color: "#1da1f2" }}>{p}</a>;
      }
      if (/^#\w+/.test(p)) {
        return <a key={i} href={`https://x.com/hashtag/${p.slice(1)}`} target="_blank" rel="noopener noreferrer"
          className="hover:underline font-semibold" style={{ color: "#1da1f2" }}>{p}</a>;
      }
      if (/^@\w+/.test(p)) {
        return <a key={i} href={`https://x.com/${p.slice(1)}`} target="_blank" rel="noopener noreferrer"
          className="hover:underline font-semibold" style={{ color: "#1da1f2" }}>{p}</a>;
      }
      return <span key={i}>{p}</span>;
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl overflow-hidden mt-8 sm:mt-16"
        style={{ background: "#0d1421", border: "1px solid #1e2d42", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "#1e2d42", background: "#0a0f1c" }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(29,161,242,0.12)", border: "1px solid rgba(29,161,242,0.25)" }}>
              <TwitterLogo size={18} style={{ color: "#1da1f2" }}/>
            </div>
            <div className="min-w-0">
              <a href={`https://x.com/${tweet.author}`} target="_blank" rel="noopener noreferrer"
                className="block text-sm font-black hover:underline truncate"
                style={{ color: "#1da1f2" }}>
                @{tweet.author}
              </a>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: "#64748b" }}>
                <Clock size={9}/>
                <span>{timeAgo(tweet.pubDate)}</span>
                <span className="opacity-60">·</span>
                <span>{new Date(tweet.pubDate).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
            <X size={14}/>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: "#e8edf5" }}>
            {renderRich(tweet.title)}
          </p>

          {/* Media — photos in a grid, videos with native controls. The
              original aspect ratio is preserved when supplied by syndication. */}
          {tweet.media && tweet.media.length > 0 && (
            <div className={`grid gap-1.5 rounded-xl overflow-hidden ${tweet.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {tweet.media.map((m, i) => {
                if (m.type === "photo") {
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={m.url} alt=""
                      className="w-full h-auto object-cover"
                      style={{ background: "#0a0f1c", maxHeight: tweet.media!.length === 1 ? 520 : 260 }}/>
                  );
                }
                return (
                  <video key={i} src={m.url} poster={m.poster}
                    controls playsInline preload="metadata"
                    className="w-full h-auto"
                    style={{ background: "#0a0f1c", maxHeight: tweet.media!.length === 1 ? 520 : 260 }}/>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between gap-3"
          style={{ borderColor: "#1e2d42", background: "#0a0f1c" }}>
          <span className="text-[10px]" style={{ color: "#475569" }}>ESC pour fermer</span>
          <a href={tweet.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:opacity-90"
            style={{ background: "#1da1f2", color: "#fff" }}>
            <ArrowSquareOut size={11}/> Voir sur 𝕏
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
