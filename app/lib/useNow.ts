"use client";
import { useEffect, useState } from "react";

// Current time, refreshed every `intervalMs`. Keeps relative labels ("il y a 5 min")
// fresh without calling Date.now() during render.
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
