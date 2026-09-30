"use client";

import { FadeText } from "@/components/ui/fade-text";

import { SectionTitle, shortDate } from "@/components/detail-parts";
import { Eye, ThumbsUp } from "@/components/icons";
import { Kpi, KpiStrip } from "@/components/kpi-strip";
import { plateTintProps } from "@/components/hover-tint";
import { Skeleton } from "@/components/ui/skeleton";
import { MiniCard, MiniCardGrid, MiniCardSkeletons } from "@/components/mini-card";
import { categoryIcon } from "@/lib/fault-categories";
import type { KbSearchResponse, KbStats } from "@/lib/types";
import { useApi } from "@/lib/useApi";

import { nf, zapisov } from "./kb-state";

const ROW =
  "-mx-2 flex h-9 w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 text-left text-sm transition-colors";

export function KbOverview({
  stats,
  onSelect,
}: {
  stats: KbStats | null;
  onSelect: (id: string) => void;
}) {
  const { data: popular } = useApi<KbSearchResponse>("/knowledge/search?sort=views&limit=4");
  const { data: recent } = useApi<KbSearchResponse>("/knowledge/search?sort=recent&limit=4");
  const { data: helpful } = useApi<KbSearchResponse>("/knowledge/search?sort=helpful&limit=5");
  const helpfulHits = (helpful?.hits ?? []).filter((h) => (h.article.helpfulUp ?? 0) > 0);

  return (
    <div className="space-y-9">
      <div className="space-y-5 pb-4">
        <header className="space-y-1">
          <p className="text-sm text-nav-foreground">Izberite zapis na levi ali začnite s kategorijo</p>
          <h2 className="text-xl font-semibold tracking-tight">Pregled baze znanja</h2>
        </header>

        <KpiStrip className="lg:grid-cols-2 @2xl:grid-cols-4">
          <Kpi label="Zapisi" loading={!stats} value={nf.format(stats?.articles ?? 0)} note={`Ročni vnosi: ${nf.format((stats?.articles ?? 0) - (stats?.fromTickets ?? 0))}`} />
          <Kpi label="Iz ticketov" loading={!stats} value={nf.format(stats?.fromTickets ?? 0)} note={`${stats && stats.articles > 0 ? Math.round((stats.fromTickets / stats.articles) * 100) : 0} % vseh zapisov`} />
          <Kpi label="Sredstva" loading={!stats} value={nf.format(stats?.machines ?? 0)} note="Z vsaj enim zapisom" />
          <Kpi label="Ogledi" loading={!stats} value={nf.format(stats?.views ?? 0)} note="Vseh branj skupaj" />
        </KpiStrip>
      </div>

      <MiniCards
        title="Največ branja"
        data={popular}
        side={(h) => (
          <span className="flex items-center gap-1 tabular-nums">
            <Eye className="size-3.5" /> {nf.format(h.article.views)}
          </span>
        )}
        onSelect={onSelect}
      />
      <MiniCards
        title="Nazadnje dodano"
        data={recent}
        side={(h) => <span className="tabular-nums">{shortDate(h.article.createdAt)}</span>}
        onSelect={onSelect}
      />

      {helpfulHits.length > 0 && (
        <MiniList
          title="Najbolj koristno"
          data={helpful ? { ...helpful, hits: helpfulHits } : null}
          side={(h) => (
            <span className="flex items-center gap-1 tabular-nums">
              <ThumbsUp className="size-3.5" /> {h.article.helpfulUp}
            </span>
          )}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

function MiniList({
  title,
  data,
  side,
  onSelect,
}: {
  title: string;
  data: KbSearchResponse | null;
  side: (hit: KbSearchResponse["hits"][number]) => React.ReactNode;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <SectionTitle bare action={data && <span className="text-xs text-nav-foreground">{data.total} {zapisov(data.total)}</span>}>
        {title}
      </SectionTitle>
      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : (
        <ul>
          {data.hits.map((h) => {
            const Icon = categoryIcon(h.article.category);
            return (
              <li key={h.id}>
                <button type="button" {...plateTintProps()} className={ROW} onClick={() => onSelect(h.id)}>
                  <Icon className="size-4 shrink-0 text-nav-foreground" />
                  <FadeText className="flex-1">{h.article.title}</FadeText>
                  <span className="shrink-0 text-xs text-nav-foreground">{side(h)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MiniCards({
  title,
  data,
  side,
  onSelect,
}: {
  title: string;
  data: KbSearchResponse | null;
  side: (hit: KbSearchResponse["hits"][number]) => React.ReactNode;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <SectionTitle bare action={data && <span className="text-xs text-nav-foreground">{data.total} {zapisov(data.total)}</span>}>
        {title}
      </SectionTitle>
      <MiniCardGrid>
        {!data ? (
          <MiniCardSkeletons />
        ) : (
          data.hits.map((h) => (
            <MiniCard
              key={h.id}
              title={h.article.title}
              meta={h.article.category?.name ?? "Brez kategorije"}
              metaIcon={categoryIcon(h.article.category)}
              side={side(h)}
              onClick={() => onSelect(h.id)}
            />
          ))
        )}
      </MiniCardGrid>
    </section>
  );
}
