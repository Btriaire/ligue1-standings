"use client";

import { useSyncExternalStore } from "react";

// false on the server and during hydration, true once mounted on the client.
// Replaces `useState(false)` + `useEffect(() => setMounted(true), [])`.
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {}, // subscribe no-op
    () => true,     // client snapshot
    () => false     // server snapshot
  );
}
