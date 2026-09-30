"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, apiGet } from "./api";
import type { KbSearchResponse } from "./types";

const cache = new Map<string, KbSearchResponse>();

export const KB_SEARCH_PATH = "/knowledge/search";

export function useKbSearch(params: URLSearchParams | null, debounceMs = 180) {
  const path = params ? `${KB_SEARCH_PATH}?${params.toString()}` : null;
  const [data, setData] = useState<KbSearchResponse | null>(() => (path ? (cache.get(path) ?? null) : null));
  const [loading, setLoading] = useState(() => path !== null && !cache.has(path));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const run = useCallback(async (target: string) => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setRefreshing(true);
    setError(null);
    try {
      const json = await apiGet<KbSearchResponse>(target, { signal: ctrl.signal });
      cache.set(target, json);
      if (!ctrl.signal.aborted) setData(json);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e instanceof ApiError ? e.message : "Iskanje ni uspelo.");
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!path) return;
    const cached = cache.get(path);
    if (cached) setData(cached);
    else if (!data) setLoading(true);
    const id = window.setTimeout(() => void run(path), cached ? 0 : debounceMs);
    return () => window.clearTimeout(id);
  }, [path, run, debounceMs]);

  useEffect(() => () => controller.current?.abort(), []);

  const refetch = useCallback(() => {
    if (path) {
      cache.delete(path);
      void run(path);
    }
  }, [path, run]);

  return { data, loading, refreshing, error, refetch };
}

export function clearKbSearchCache(): void {
  cache.clear();
}
