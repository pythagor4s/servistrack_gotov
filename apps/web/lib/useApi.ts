"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiGetList, ApiError } from "./api";

const cache = new Map<string, unknown>();
const listCache = new Map<string, { items: unknown[]; total: number }>();

export function prefetch(path: string): void {
  if (cache.has(path)) return;
  void apiGet<unknown>(path)
    .then((data) => cache.set(path, data))
    .catch(() => {});
}

export type ApiState<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

const NET_ERROR = "Network error: is the API running?";

function fromCache<T>(path: string | null): ApiState<T> {
  const cached = path === null ? undefined : (cache.get(path) as T | undefined);
  return {
    data: cached ?? null,
    loading: path !== null && cached === undefined,
    refreshing: false,
    error: null,
  };
}

export function useApi<T>(
  path: string | null,
): ApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<ApiState<T>>(() => fromCache<T>(path));

  const load = useCallback(async () => {
    if (path === null) return;
    setState((s) => ({
      data: s.data,
      loading: s.data === null,
      refreshing: true,
      error: null,
    }));
    try {
      const data = await apiGet<T>(path);
      cache.set(path, data);
      setState({ data, loading: false, refreshing: false, error: null });
    } catch (e) {
      setState((s) => ({
        data: s.data,
        loading: false,
        refreshing: false,
        error: e instanceof ApiError ? e.message : NET_ERROR,
      }));
    }
  }, [path]);

  useEffect(() => {
    setState(fromCache<T>(path));
    void load();
  }, [path, load]);

  return { ...state, refetch: load };
}

export type ApiListState<T> = {
  items: T[];
  total: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

function listFromCache<T>(path: string | null): ApiListState<T> {
  const cached = path === null ? undefined : listCache.get(path);
  return {
    items: (cached?.items as T[] | undefined) ?? [],
    total: cached?.total ?? 0,
    loading: path !== null && cached === undefined,
    refreshing: false,
    error: null,
  };
}

export function useApiList<T>(
  path: string | null,
): ApiListState<T> & { refetch: () => void } {
  const [state, setState] = useState<ApiListState<T>>(() => listFromCache<T>(path));

  const load = useCallback(async () => {
    if (path === null) return;
    setState((s) => ({
      items: s.items,
      total: s.total,
      loading: s.items.length === 0,
      refreshing: true,
      error: null,
    }));
    try {
      const { items, total } = await apiGetList<T>(path);
      listCache.set(path, { items: items as unknown[], total });
      setState({ items, total, loading: false, refreshing: false, error: null });
    } catch (e) {
      setState((s) => ({
        items: s.items,
        total: s.total,
        loading: false,
        refreshing: false,
        error: e instanceof ApiError ? e.message : NET_ERROR,
      }));
    }
  }, [path]);

  useEffect(() => {
    const next = listFromCache<T>(path);
    setState((s) =>
      next.loading && s.items.length > 0
        ? { ...s, loading: false, refreshing: true, error: null }
        : next,
    );
    void load();
  }, [path, load]);

  return { ...state, refetch: load };
}
