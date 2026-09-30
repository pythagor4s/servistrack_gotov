import { KB_SORTS, type KbSort } from "@servis-track/shared";

import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Eye,
  SortAlpha,
  Target,
  ThumbsUp,
  type IconComponent,
} from "@/components/icons";

export type KbFilters = {
  q: string;
  categoryId: string;
  type: string;
  departmentId: string;
  machineId: string;
  source: string;
  tag: string;
  pinned: string;
  sort: string;
};

export const KB_DEFAULTS: KbFilters = {
  q: "",
  categoryId: "",
  type: "",
  departmentId: "",
  machineId: "",
  source: "",
  tag: "",
  pinned: "",
  sort: "",
};

export const KB_FILTER_KEYS = Object.keys(KB_DEFAULTS) as (keyof KbFilters)[];

export function effectiveSort(f: KbFilters): KbSort {
  if ((KB_SORTS as readonly string[]).includes(f.sort)) return f.sort as KbSort;
  return f.q.trim() ? "relevance" : "recent";
}

export function searchParams(f: KbFilters, limit: number): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q);
  for (const key of ["categoryId", "type", "departmentId", "machineId", "source", "tag"] as const) {
    if (f[key]) p.set(key, f[key]);
  }
  if (f.pinned) p.set("pinned", "true");
  const sort = effectiveSort(f);
  if (sort !== (f.q.trim() ? "relevance" : "recent")) p.set("sort", sort);
  p.set("limit", String(limit));
  return p;
}

export function activeFilterCount(f: KbFilters): number {
  return [f.categoryId, f.type, f.departmentId, f.machineId, f.source, f.tag, f.pinned].filter(Boolean)
    .length;
}

export const SORT_META: Record<KbSort, { label: string; icon: IconComponent }> = {
  relevance: { label: "Najboljše ujemanje", icon: Target },
  recent: { label: "Najprej najnovejši", icon: ArrowDownWideNarrow },
  oldest: { label: "Najprej najstarejši", icon: ArrowUpWideNarrow },
  views: { label: "Največ ogledov", icon: Eye },
  helpful: { label: "Najbolj koristni", icon: ThumbsUp },
  az: { label: "Naslov A–Ž", icon: SortAlpha },
};

export const SOURCE_LABEL: Record<string, string> = {
  ticket: "Iz rešenih ticketov",
  manual: "Ročni vnosi",
};

export const nf = new Intl.NumberFormat("sl-SI");

export function plural(n: number, one: string, two: string, few: string, many: string): string {
  const mod = n % 100;
  if (mod === 1) return one;
  if (mod === 2) return two;
  if (mod === 3 || mod === 4) return few;
  return many;
}

export const zapisov = (n: number) => plural(n, "zapis", "zapisa", "zapisi", "zapisov");
export const zadetkov = (n: number) => plural(n, "zadetek", "zadetka", "zadetki", "zadetkov");
