import type { Ticket } from "./types";

export const BACKLOG_WEEKS = 12;

export type Backlog = {
  points: number[];
  current: number;
  at: string[];
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function closedAt(t: Ticket, opened: number): number | null {
  if (t.resolvedAt !== null) return Date.parse(t.resolvedAt);
  return t.status === "RESOLVED" ? opened : null;
}

export function weeklyBacklog(tickets: Ticket[], weeks: number = BACKLOG_WEEKS): Backlog {
  let anchor: number | null = null;
  for (const t of tickets) {
    const at = Date.parse(t.createdAt);
    if (!Number.isNaN(at) && (anchor === null || at > anchor)) anchor = at;
  }
  if (anchor === null) {
    return { points: new Array<number>(weeks).fill(0), current: 0, at: [] };
  }
  const first = anchor - (weeks - 1) * WEEK_MS;

  const spans: { opened: number; closed: number | null }[] = [];
  for (const t of tickets) {
    const opened = Date.parse(t.createdAt);
    if (Number.isNaN(opened)) continue;
    spans.push({ opened, closed: closedAt(t, opened) });
  }

  const points: number[] = [];
  const at: string[] = [];
  for (let i = 0; i < weeks; i++) {
    const edge = first + i * WEEK_MS;
    let open = 0;
    for (const s of spans) {
      if (s.opened <= edge && (s.closed === null || s.closed > edge)) open++;
    }
    points.push(open);
    at.push(new Date(edge).toISOString());
  }

  return { points, current: points[weeks - 1] ?? 0, at };
}

export const FLOW_WEEKS = 4;

export type WeekFlow = {
  start: string;
  opened: number;
  resolved: number;
};

export function weeklyFlow(tickets: Ticket[], weeks: number = FLOW_WEEKS): WeekFlow[] {
  let anchor: number | null = null;
  for (const t of tickets) {
    const at = Date.parse(t.createdAt);
    if (!Number.isNaN(at) && (anchor === null || at > anchor)) anchor = at;
  }
  if (anchor === null) return [];
  const end = anchor + 1;
  const first = end - weeks * WEEK_MS;

  const out: WeekFlow[] = Array.from({ length: weeks }, (_, i) => ({
    start: new Date(first + i * WEEK_MS).toISOString(),
    opened: 0,
    resolved: 0,
  }));
  const bucket = (ms: number) => {
    if (ms < first || ms >= end) return null;
    return Math.floor((ms - first) / WEEK_MS);
  };
  for (const t of tickets) {
    const opened = Date.parse(t.createdAt);
    if (Number.isNaN(opened)) continue;
    const o = bucket(opened);
    if (o !== null) out[o]!.opened++;
    const closed = closedAt(t, opened);
    const c = closed === null ? null : bucket(closed);
    if (c !== null) out[c]!.resolved++;
  }
  return out;
}
