"use client";

import { useEffect, useRef } from "react";

type Params = { get(key: string): string | null };

export function paramOr(
  params: Params,
  key: string,
  fallback: string,
  allowed?: readonly string[],
): string {
  const raw = params.get(key);
  if (raw === null || raw === "") return fallback;
  if (allowed && !allowed.includes(raw)) return fallback;
  return raw;
}

export function useFiltersInUrl(
  values: Record<string, string>,
  defaults: Record<string, string>,
): void {
  const serialized = JSON.stringify(values);
  const defaultsRef = useRef(defaults);

  useEffect(() => {
    const current = JSON.parse(serialized) as Record<string, string>;
    const id = window.setTimeout(() => {
      const next = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(current)) {
        if (value === "" || value === defaultsRef.current[key]) next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      if (qs === window.location.search.replace(/^\?/, "")) return;
      window.history.replaceState(
        null,
        "",
        qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
      );
    }, 250);
    return () => window.clearTimeout(id);
  }, [serialized]);
}
