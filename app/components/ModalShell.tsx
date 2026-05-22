"use client";

import { useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { X } from "@phosphor-icons/react";

// Shared modal shell — backdrop + framed card + close button. Used by:
//
//   • PlayerModal     (club/[id]/page)
//   • NewsModal       (mercato article reader)
//
// What the shell owns:
//   • Backdrop with click-to-dismiss (only fires when the click is on the
//     backdrop itself, not on bubbled children).
//   • Escape key to close.
//   • Body scroll lock while open, with scroll-position restore on close.
//   • A floating close button in the top-right if `showCloseButton`.
//
// What callers own: the inner content (header, body, footer). The shell
// renders children straight into the card without imposing any padding or
// scroll behavior — callers wrap their own scroll container so they can
// place sticky headers / fixed footers however they want.

interface ModalShellProps {
  children: ReactNode;
  onClose: () => void;
  /** Tailwind max-width class applied to the card. Defaults to "sm:max-w-md". */
  maxWidth?: string;
  /** Backdrop background color. Defaults to "rgba(0,0,0,0.85)". */
  backdrop?: string;
  /** Apply backdrop-filter: blur(6px). Default false. */
  blur?: boolean;
  /** Show the floating close button. Default true. */
  showCloseButton?: boolean;
  /** Max card height. Defaults to "90vh". NewsModal uses "92dvh". */
  maxHeight?: string;
}

export default function ModalShell({
  children,
  onClose,
  maxWidth = "sm:max-w-md",
  backdrop = "rgba(0,0,0,0.85)",
  blur = false,
  showCloseButton = true,
  maxHeight = "90vh",
}: ModalShellProps) {
  const scrollRef = useRef(0);

  // Body scroll lock + scroll-position restore.
  useEffect(() => {
    scrollRef.current = window.scrollY;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      requestAnimationFrame(() => window.scrollTo({ top: scrollRef.current }));
    };
  }, []);

  // Escape to close.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: backdrop, backdropFilter: blur ? "blur(6px)" : undefined }}
      onClick={handleBackdropClick}
    >
      <div
        className={`relative w-full ${maxWidth} mx-0 sm:mx-4 flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden`}
        style={{
          background: "#0d1421",
          border: "1px solid #1e2d42",
          maxHeight,
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
            style={{ background: "rgba(255,255,255,0.08)", color: "#94a3b8" }}
            aria-label="Fermer"
          >
            <X size={15} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
