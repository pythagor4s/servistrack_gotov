"use client";

import { FadeText } from "@/components/ui/fade-text";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { FromTicketBadge, TYPE_META } from "@/components/badges";
import { SectionTitle, shortDate } from "@/components/detail-parts";
import {
  Copy,
  Eye,
  Network,
  NotebookPen,
  Pencil,
  Pin,
  ThumbsDown,
  ThumbsUp,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { plateTintProps } from "@/components/hover-tint";
import { Skeleton } from "@/components/ui/skeleton";
import { IconAction } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/user-avatar";
import { apiPatch, apiPost, apiPut } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { categoryIcon } from "@/lib/fault-categories";
import { formatDate } from "@/lib/format";
import type { KbLink, KnowledgeArticle, KnowledgeArticleDetail } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useMutate } from "@/lib/use-mutate";
import { clearKbSearchCache } from "@/lib/use-kb-search";
import { cn } from "@/lib/utils";

import { TagChip } from "./kb-facets";
import { headingSlug, rehypeHeadingIds, rehypeMark } from "./highlight";
import { nf } from "./kb-state";

export function KbReader({
  id,
  prefixes = [],
  onEdit,
  onChanged,
  onNavigate,
  onFilterTag,
  onFilterCategory,
}: {
  id: string;
  prefixes?: string[];
  onEdit?: (article: KnowledgeArticleDetail) => void;
  onChanged?: () => void;
  onNavigate?: (id: string) => void;
  onFilterTag?: (tag: string) => void;
  onFilterCategory?: (categoryId: string) => void;
}) {
  const { data: a, loading, error, refetch } = useApi<KnowledgeArticleDetail>(`/knowledge/${id}`);
  useCountView(id);

  if (loading || (!a && !error)) return <ReaderSkeleton />;
  if (error || !a) {
    return <p className="py-10 text-center text-sm text-nav-foreground">{error ?? "Zapisa ni mogoče naložiti."}</p>;
  }
  return (
    <ReaderBody
      a={a}
      prefixes={prefixes}
      refetch={refetch}
      onEdit={onEdit}
      onChanged={onChanged}
      onNavigate={onNavigate}
      onFilterTag={onFilterTag}
      onFilterCategory={onFilterCategory}
    />
  );
}

function useCountView(id: string) {
  useEffect(() => {
    const key = `servis-track:kb-viewed:${id}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
    }
    const t = window.setTimeout(() => void apiPost(`/knowledge/${id}/view`).catch(() => {}), 1200);
    return () => window.clearTimeout(t);
  }, [id]);
}

function ReaderBody({
  a,
  prefixes,
  refetch,
  onEdit,
  onChanged,
  onNavigate,
  onFilterTag,
  onFilterCategory,
}: {
  a: KnowledgeArticleDetail;
  prefixes: string[];
  refetch: () => void;
  onEdit?: (article: KnowledgeArticleDetail) => void;
  onChanged?: () => void;
  onNavigate?: (id: string) => void;
  onFilterTag?: (tag: string) => void;
  onFilterCategory?: (categoryId: string) => void;
}) {
  const { user, isAdmin } = useAuth();
  const isTicket = !!a.ticketId;
  const canManage = isAdmin || (!!a.createdById && a.createdById === user?.id);
  const canOpenTicket = isTicket && (isAdmin || a.ticket?.reporterId === user?.id);
  const CategoryIcon = categoryIcon(a.category);
  const machine = a.machine ?? a.ticket?.machine ?? null;
  const TypeIcon = TYPE_META[a.type].icon;
  const author = authorOf(a);
  const cause = useMemo(() => causeMarkdown(a.body), [a.body]);
  const plugins = useMemo(() => [rehypeHeadingIds, rehypeMark(prefixes)], [prefixes]);
  const { run, busy } = useMutate(async () => {
    clearKbSearchCache();
    refetch();
    onChanged?.();
  });

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <div className="flex min-h-8 items-start justify-between gap-3">
          <div className="flex min-h-8 min-w-0 items-center gap-1.5 text-sm text-nav-foreground">
            {a.category && onFilterCategory ? (
              <button
                type="button"
                onClick={() => onFilterCategory(a.category!.id)}
                className="flex min-w-0 items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <CategoryIcon className="size-4 shrink-0" />
                <FadeText>{a.category.name}</FadeText>
              </button>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5">
                <CategoryIcon className="size-4 shrink-0" />
                <FadeText>{a.category?.name ?? "Brez kategorije"}</FadeText>
              </span>
            )}
            <span aria-hidden>/</span>
            <span className="flex min-w-0 items-center gap-1.5">
              <TypeIcon className="size-4 shrink-0" />
              <FadeText>{machine ? `${machine.brand} ${machine.model}` : TYPE_META[a.type].label}</FadeText>
            </span>
          </div>
          <ReaderActions
            a={a}
            canManage={canManage}
            busy={busy}
            onPin={() =>
              run(() => apiPatch(`/knowledge/${a.id}`, { pinned: !a.pinned }), a.pinned ? "Odpeto" : "Pripeto")
            }
            onEdit={onEdit ? () => onEdit(a) : undefined}
          />
        </div>

        <h2 className="pt-1 text-2xl leading-tight font-semibold tracking-tight text-balance">{a.title}</h2>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-nav-foreground">
          <span className="flex min-w-0 items-center gap-2">
            {author.user && (
              <UserAvatar
                user={{
                  id: author.user.id,
                  name: author.user.name,
                  username: author.user.username,
                  hasImage: author.user.image != null,
                  imageUpdatedAt: author.user.image?.updatedAt ?? null,
                }}
                className="size-6"
              />
            )}
            <FadeText className="text-foreground">{author.name ?? "Neznan avtor"}</FadeText>
          </span>
          <span className="tabular-nums">{formatDate(a.createdAt)}</span>
          {a.department && (
            <span className="flex min-w-0 items-center gap-1">
              <Network className="size-4 shrink-0" />
              <FadeText>{a.department.name}</FadeText>
            </span>
          )}
          <span className="flex items-center gap-1 tabular-nums" title="Ogledi">
            <Eye className="size-4" />
            {nf.format(a.views)}
          </span>
          {isTicket &&
            (canOpenTicket ? (
              <Link href={`/zahtevki/${a.ticketId}`} className="rounded-full transition-opacity hover:opacity-80">
                <FromTicketBadge number={a.ticket?.number} />
              </Link>
            ) : (
              <FromTicketBadge />
            ))}
          {!isTicket && (
            <span className="flex items-center gap-1">
              <NotebookPen className="size-4" />
              Ročni vnos
            </span>
          )}
        </div>
      </header>

      {cause ? (
        <div className="space-y-4 border-t pt-6">
          {cause.before && <Markdown rehypePlugins={plugins}>{cause.before}</Markdown>}
          <section
            id={headingSlug(cause.heading)}
            aria-label={cause.heading}
            className="scroll-mt-4 rounded-lg border bg-surface-inset px-4 py-3"
          >
            <p className="mb-1.5 text-xs font-medium tracking-wider text-nav-foreground uppercase">{cause.heading}</p>
            <Markdown rehypePlugins={plugins}>{cause.text}</Markdown>
          </section>
          {cause.after && <Markdown rehypePlugins={plugins}>{cause.after}</Markdown>}
        </div>
      ) : (
        <div className="border-t pt-6">
          <Markdown rehypePlugins={plugins}>{a.body}</Markdown>
        </div>
      )}

      {(a.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(a.tags ?? []).map((t) => (
            <TagChip key={t} label={t} onClick={onFilterTag ? () => onFilterTag(t) : undefined} />
          ))}
        </div>
      )}

      <Feedback a={a} onVoted={() => { clearKbSearchCache(); onChanged?.(); }} />

      <div className="grid gap-6 pb-2">
        <LinkList title="Sorodni zapisi" items={a.related} onNavigate={onNavigate} empty="Iskalnik ni našel sorodnih zapisov." />
        {a.sameMachine.length > 0 && (
          <LinkList title="Na istem sredstvu" items={a.sameMachine} onNavigate={onNavigate} />
        )}
      </div>
    </article>
  );
}

function ReaderActions({
  a,
  canManage,
  busy,
  onPin,
  onEdit,
}: {
  a: KnowledgeArticle;
  canManage: boolean;
  busy: boolean;
  onPin: () => void;
  onEdit?: () => void;
}) {
  function copyLink() {
    const url = `${window.location.origin}/znanje?id=${a.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Povezava kopirana"))
      .catch(() => toast.error("Povezave ni bilo mogoče kopirati"));
  }
  const iconButton = "text-nav-foreground hover:text-foreground";
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <IconAction label="Kopiraj povezavo">
        <Button variant="ghost" size="icon-sm" onClick={copyLink} aria-label="Kopiraj povezavo" className={iconButton}>
          <Copy className="size-4" />
        </Button>
      </IconAction>
      {canManage && (
        <IconAction label={a.pinned ? "Odpni" : "Pripni na vrh"}>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            onClick={onPin}
            aria-label={a.pinned ? "Odpni" : "Pripni na vrh"}
            aria-pressed={a.pinned}
            className={iconButton}
          >
            <Pin className={cn("size-4 rotate-[-30deg]", a.pinned && "fill-current text-foreground")} />
          </Button>
        </IconAction>
      )}
      {canManage && onEdit && (
        <IconAction label="Uredi">
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Uredi" className={iconButton}>
            <Pencil className="size-4" />
          </Button>
        </IconAction>
      )}
    </div>
  );
}

function Feedback({ a, onVoted }: { a: KnowledgeArticleDetail; onVoted: () => void }) {
  const [state, setState] = useState({ up: a.helpfulUp, down: a.helpfulDown, mine: a.myFeedback });
  const [busy, setBusy] = useState(false);
  useEffect(() => setState({ up: a.helpfulUp, down: a.helpfulDown, mine: a.myFeedback }), [a]);

  async function vote(helpful: boolean) {
    const next = state.mine === helpful ? null : helpful;
    setBusy(true);
    try {
      const res = await apiPut<{ helpfulUp: number; helpfulDown: number; myFeedback: boolean | null }>(
        `/knowledge/${a.id}/feedback`,
        { helpful: next },
      );
      setState({ up: res.helpfulUp, down: res.helpfulDown, mine: res.myFeedback });
      if (next !== null) toast.success(next ? "Hvala - zapis bo višje med zadetki" : "Hvala za odziv");
      onVoted();
    } catch {
      toast.error("Glasu ni bilo mogoče shraniti");
    } finally {
      setBusy(false);
    }
  }

  const choice = (helpful: boolean, count: number, label: string, Icon: typeof ThumbsUp) => (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      aria-pressed={state.mine === helpful}
      onClick={() => void vote(helpful)}
      className={cn("bg-transparent font-normal", state.mine === helpful && "border-foreground")}
    >
      <Icon className={cn("size-4", state.mine === helpful && "text-foreground")} />
      {label}
      <span className="text-nav-foreground tabular-nums">{count}</span>
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <p className="text-sm text-nav-foreground">Vam je ta zapis pomagal rešiti težavo?</p>
      <div className="flex gap-2">
        {choice(true, state.up, "Da", ThumbsUp)}
        {choice(false, state.down, "Ne", ThumbsDown)}
      </div>
    </div>
  );
}

export function LinkList({
  title,
  items,
  onNavigate,
  empty,
  action,
}: {
  title: string;
  items: KbLink[];
  onNavigate?: (id: string) => void;
  empty?: string;
  action?: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <SectionTitle bare action={action}>{title}</SectionTitle>
      {items.length === 0 ? (
        empty ? <p className="text-sm text-nav-foreground">{empty}</p> : null
      ) : (
        <ul>
          {items.map((l) => {
            const Icon = categoryIcon(l.category);
            const machine = l.machine ?? l.ticket?.machine ?? null;
            const row = (
              <>
                <Icon className="size-4 shrink-0 text-nav-foreground" />
                <FadeText className="flex-1">{l.title}</FadeText>
                <span className="hidden shrink-0 text-xs text-nav-foreground sm:inline">
                  {machine ? `${machine.brand} ${machine.model}` : shortDate(l.createdAt)}
                </span>
              </>
            );
            const cls =
              "-mx-2 flex h-9 w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 text-left text-sm transition-colors";
            return (
              <li key={l.id}>
                {onNavigate ? (
                  <button type="button" {...plateTintProps()} className={cls} onClick={() => onNavigate(l.id)}>
                    {row}
                  </button>
                ) : (
                  <Link href={`/znanje?id=${l.id}`} {...plateTintProps()} className={cls}>
                    {row}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ReaderSkeleton() {
  return (
    <div className="space-y-5" aria-busy>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-7 w-4/5" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={cn("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

export function authorOf(a: KnowledgeArticle) {
  if (a.ticketId) {
    const r = a.ticket?.reporter ?? null;
    return { user: r, name: r?.name ?? r?.username ?? a.ticket?.reporterName ?? null };
  }
  const c = a.createdBy ?? null;
  return { user: c, name: c?.name ?? c?.username ?? null };
}

const CAUSE = /^(vzrok|ugotovitev serviserja|ugotovitev|kaj je bilo narobe)\b/i;
const HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

export function causeMarkdown(
  md: string,
): { heading: string; text: string; before: string; after: string } | null {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => {
    const h = HEADING.exec(l);
    return !!h && CAUSE.test(h[1]!);
  });
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && HEADING.test(l));
  if (end < 0) end = lines.length;
  const text = lines.slice(start + 1, end).join("\n").trim();
  if (!text) return null;
  return {
    heading: HEADING.exec(lines[start]!)![1]!,
    text,
    before: lines.slice(0, start).join("\n").trim(),
    after: lines.slice(end).join("\n").trim(),
  };
}
