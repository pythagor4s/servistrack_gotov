"use client";

import { useEffect, type KeyboardEvent, type ReactNode, type Ref } from "react";

import { FromTicketBadge, TYPE_META } from "@/components/badges";
import { shortDate } from "@/components/detail-parts";
import { Eye, Pin, ThumbsUp } from "@/components/icons";
import { plateTintProps } from "@/components/hover-tint";
import { FadeText } from "@/components/ui/fade-text";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryIcon } from "@/lib/fault-categories";
import type { KbHit } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Highlight } from "./highlight";
import { ShareBar } from "./relevance-meter";
import { nf } from "./kb-state";

export const optionId = (id: string) => `kb-option-${id}`;

export const matchOf = (h: { relevance: number; matchPct: number }) => Math.round((h.relevance + h.matchPct) / 2);

export function KbResultList({
  hits,
  selectedId,
  onSelect,
  querying,
  ranked,
  loading,
  refreshing,
  empty,
  header,
  footer,
  listRef,
  onExitTop,
  onClear,
}: {
  hits: KbHit[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  querying: boolean;
  ranked: boolean;
  loading: boolean;
  refreshing: boolean;
  empty: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  listRef?: Ref<HTMLDivElement>;
  onExitTop?: () => void;
  onClear?: () => void;
}) {
  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(optionId(selectedId))?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  if (loading) {
    return (
      <div className="space-y-1" aria-busy>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex gap-3 px-3 py-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (hits.length === 0) return <>{empty}</>;

  const index = hits.findIndex((h) => h.id === selectedId);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const move = (to: number) => {
      e.preventDefault();
      const next = hits[Math.max(0, Math.min(hits.length - 1, to))];
      if (next) onSelect(next.id);
    };
    switch (e.key) {
      case "ArrowDown":
      case "j":
        return move(index + 1);
      case "ArrowUp":
      case "k":
        if (index <= 0 && onExitTop) {
          e.preventDefault();
          return onExitTop();
        }
        return move(index - 1);
      case "Home":
        return move(0);
      case "End":
        return move(hits.length - 1);
      case "Escape":
        if (selectedId && onClear) {
          e.preventDefault();
          onClear();
        }
    }
  }

  return (
    <>
      {header}
      <div
        ref={listRef}
        role="listbox"
        tabIndex={0}
        aria-label="Zadetki baze znanja"
        aria-activedescendant={selectedId ? optionId(selectedId) : undefined}
        onKeyDown={onKeyDown}
        className={cn(
          "flex flex-col gap-2 rounded-lg outline-none transition-opacity duration-200",
          refreshing && "opacity-70",
        )}
      >
        {hits.map((hit, i) => (
          <KbResultRow
            key={hit.id}
            hit={hit}
            rank={ranked ? i + 1 : null}
            selected={hit.id === selectedId}
            querying={querying}
            onSelect={() => onSelect(hit.id)}
          />
        ))}
      </div>
      {footer}
    </>
  );
}

function KbResultRow({
  hit,
  rank,
  selected,
  querying,
  onSelect,
}: {
  hit: KbHit;
  rank: number | null;
  selected: boolean;
  querying: boolean;
  onSelect: () => void;
}) {
  const a = hit.article;
  const Icon = categoryIcon(a.category);
  const machine = a.machine ?? a.ticket?.machine ?? null;
  const TypeIcon = TYPE_META[a.type].icon;
  const snippet = hit.snippet;
  const match = matchOf(hit);

  return (
    <div
      id={optionId(hit.id)}
      role="option"
      aria-selected={selected}
      aria-current={selected || undefined}
      {...plateTintProps()}
      onClick={onSelect}
      className={cn(
        "group/row relative flex cursor-default gap-3 rounded-lg border p-3.5 transition-colors",
        selected ? "border-foreground/35" : "hover:border-border-row-hover",
      )}
    >
      {rank !== null ? (
        <span
          aria-label={`Mesto ${rank}`}
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            rank === 1 ? "bg-foreground text-background" : "bg-surface-inset text-nav-foreground",
          )}
        >
          {rank}
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <FadeText lines={2} className="text-sm leading-snug font-semibold">
              <Highlight text={a.title} ranges={hit.title} />
            </FadeText>
            {querying && (
              <span className="mt-1 flex min-w-0 items-center gap-3 text-xs text-nav-foreground">
                <span className="flex min-w-0 items-center gap-1">
                  <Icon className="size-3.5 shrink-0" />
                  <FadeText>{a.category?.name ?? "Brez kategorije"}</FadeText>
                </span>
                {a.ticketId && <FromTicketBadge />}
                <span className="flex min-w-0 items-center gap-1">
                  <TypeIcon className="size-3.5 shrink-0" />
                  <FadeText>{machine ? `${machine.brand} ${machine.model}` : TYPE_META[a.type].label}</FadeText>
                </span>
              </span>
            )}
          </div>
          {querying ? (
            <span className="w-14 shrink-0 space-y-1 text-right">
              <span className="block text-[11px] text-nav-foreground">Ujemanje</span>
              <span className="block text-sm leading-none font-semibold tabular-nums">{match} %</span>
              <ShareBar value={match} />
            </span>
          ) : (
            a.pinned && (
              <Pin aria-label="Pripeto" className="mt-0.5 size-3.5 shrink-0 rotate-[-30deg] fill-current text-nav-foreground" />
            )
          )}
        </div>

        {querying && hit.cause ? (
          <blockquote className="mt-2 border-l-2 border-foreground pl-3 text-[13px] leading-relaxed">
            <FadeText lines={2}>{hit.cause}</FadeText>
          </blockquote>
        ) : (
          <FadeText lines={2} className="mt-1 text-[13px] leading-relaxed text-nav-foreground">
            <Highlight text={snippet.text} ranges={snippet.ranges} />
          </FadeText>
        )}

        {querying ? (
          <span className="mt-2 flex min-w-0 flex-wrap items-center gap-1 text-xs">
            {hit.matched.map((m) => (
              <span key={m.term} className="rounded-sm bg-search-hit px-1 text-search-hit-foreground">
                {m.kind === "exact" || m.as.toLowerCase() === m.term.toLowerCase() ? m.as : `${m.term} → ${m.as}`}
              </span>
            ))}
          </span>
        ) : (
          <div className="mt-2 flex min-w-0 items-center gap-3 text-xs text-nav-foreground">
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex min-w-0 items-center gap-1.5 leading-4 transition-colors",
                  selected && "text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <FadeText>{a.category?.name ?? "Brez kategorije"}</FadeText>
              </span>
              {a.ticketId && <FromTicketBadge />}
            </span>
            <span className="flex min-w-0 max-w-[45%] items-center gap-1">
              <TypeIcon className="size-3.5 shrink-0" />
              <FadeText>{machine ? `${machine.brand} ${machine.model}` : TYPE_META[a.type].label}</FadeText>
            </span>
            <span className="shrink-0 tabular-nums">{shortDate(a.createdAt)}</span>
            {a.views > 0 && (
              <span className="flex shrink-0 items-center gap-1 tabular-nums">
                <Eye className="size-3.5" />
                {nf.format(a.views)}
              </span>
            )}
            {(a.helpfulUp ?? 0) > 0 && (
              <span className="flex shrink-0 items-center gap-1 tabular-nums">
                <ThumbsUp className="size-3.5" />
                {a.helpfulUp}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
