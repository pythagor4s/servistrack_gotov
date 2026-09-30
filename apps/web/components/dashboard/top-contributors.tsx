"use client";

import { useMemo } from "react";

import { UserAvatar } from "@/components/user-avatar";
import { EmptyNote } from "@/components/detail-parts";
import { FadeText } from "@/components/ui/fade-text";
import { User } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { ticketCountLabel } from "@/lib/format";
import { zapisov } from "@/components/knowledge/kb-state";
import type { KnowledgeArticle, Ticket, UserImageRef } from "@/lib/types";

export type ContributorMetric = "reports" | "entries";

const ROWS = 6;

type Person = { id: string; username: string; name: string | null; image?: UserImageRef | null };
type Row = { user: Person; reports: number; entries: number };

export function TopContributors({
  tickets,
  articles,
  metric,
  loading,
}: {
  tickets: Ticket[];
  articles: KnowledgeArticle[] | null;
  metric: ContributorMetric;
  loading: boolean;
}) {
  const rows = useMemo(() => {
    const byUser = new Map<string, Row>();
    const entry = (user: Person) => {
      const row = byUser.get(user.id) ?? { user, reports: 0, entries: 0 };
      byUser.set(user.id, row);
      return row;
    };
    for (const t of tickets) if (t.reporter) entry(t.reporter).reports++;
    for (const a of articles ?? []) {
      const author = a.createdBy ?? a.ticket?.reporter;
      if (author) entry(author).entries++;
    }
    const other: ContributorMetric = metric === "reports" ? "entries" : "reports";
    return [...byUser.values()]
      .filter((r) => r[metric] > 0)
      .sort((a, b) => b[metric] - a[metric] || b[other] - a[other])
      .slice(0, ROWS);
  }, [tickets, articles, metric]);

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: ROWS }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyNote icon={User} title={metric === "reports" ? "Še ni prijav" : "Baza znanja je prazna"} />
    );
  }

  const max = rows[0]![metric];
  const label = metric === "reports" ? ticketCountLabel : zapisov;
  return (
    <ol className="space-y-0.5">
      {rows.map((r) => {
        const name = r.user.name ?? r.user.username;
        const value = r[metric];
        return (
          <li
            key={r.user.id}
            title={`${name}: ${value} ${label(value)}`}
            className="-mx-2 grid h-9 grid-cols-[minmax(0,10rem)_minmax(0,1fr)_2.5rem] items-center gap-3 rounded-md px-2 text-sm transition-colors hover:bg-surface-hover"
          >
            <span className="flex min-w-0 items-center gap-2">
              <UserAvatar
                user={{
                  id: r.user.id,
                  name: r.user.name,
                  username: r.user.username,
                  hasImage: r.user.image != null,
                  imageUpdatedAt: r.user.image?.updatedAt ?? null,
                }}
                className="size-6"
                iconClassName="size-3.5"
              />
              <FadeText className="flex-1">{name}</FadeText>
            </span>
            <span className="flex h-2.5 min-w-0 items-center" aria-hidden>
              <span
                style={{ width: `${Math.max(4, (value / max) * 100)}%` }}
                className="relative block h-1 rounded-full [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--graph-line)_12%,transparent),var(--graph-line))]"
              >
                <span className="absolute top-1/2 right-0 size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background [background-color:var(--graph-line-dot)]" />
              </span>
            </span>
            <span className="text-right text-nav-foreground tabular-nums">{value}</span>
          </li>
        );
      })}
    </ol>
  );
}
