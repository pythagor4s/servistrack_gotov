"use client";

import { useCallback, useSyncExternalStore } from "react";

const DESKTOP = "(min-width: 1024px)";

export function useIsDesktop(serverFallback = false): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mq = window.matchMedia(DESKTOP);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => serverFallback,
  );
}
