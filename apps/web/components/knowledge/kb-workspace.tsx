"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { KB_SORTS } from "@servis-track/shared";

import { TYPE_META } from "@/components/badges";
import { SectionTitle } from "@/components/detail-parts";
import { plateTintProps } from "@/components/hover-tint";
import { FiltersToggle, SearchRow } from "@/components/filter-bar";
import { PageDate } from "@/components/page-date";
import { MobileFilters } from "@/components/filter-dialog";
import {
  ChevronLeft,
  Plus,
  Tags,
  Search,
  Shapes,
  Sparkles,
  Stethoscope,
  X,
} from "@/components/icons";
import { BarCircle, MobileBarActions } from "@/components/mobile-action-bar";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { FadeText } from "@/components/ui/fade-text";
import { SearchTextarea } from "@/components/ui/search-textarea";
import { segmentTintProps } from "@/components/view-toggle";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { FAULT_ICON, useFaultCategories } from "@/lib/fault-categories";
import type { TicketType } from "@servis-track/shared";
import type { Department, KnowledgeArticle, Machine } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useIsDesktop } from "@/lib/use-media";
import { useMutate } from "@/lib/use-mutate";
import { clearKbSearchCache, useKbSearch } from "@/lib/use-kb-search";
import { useFiltersInUrl } from "@/lib/url-filters";
import { cn } from "@/lib/utils";

import { markPrefixes } from "./highlight";
import { KbDeleteDialog, KbEntryDialog } from "./kb-entry-dialog";
import { KbFacets } from "./kb-facets";
import { KbOverview } from "./kb-overview";
import { KbReader } from "./kb-reader";
import { KbResultList } from "./kb-result-list";
import { SortMenu } from "./sort-menu";
import {
  KB_DEFAULTS,
  KB_FILTER_KEYS,
  SOURCE_LABEL,
  activeFilterCount,
  effectiveSort,
  nf,
  searchParams,
  zapisov,
  type KbFilters,
} from "./kb-state";

const PAGE = 30;
const MAX = 100;

export function KnowledgeWorkspace() {
  const params = useSearchParams();
  const isDesktop = useIsDesktop(true);

  const [filters, setFilters] = useState<KbFilters>(() => filtersFromParams(params));
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get("id"));
  const [limit, setLimit] = useState(PAGE);
  const [facetsOpen, setFacetsOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(() => params.get("new") === "1");
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);
  const [deleting, setDeleting] = useState<KnowledgeArticle | null>(null);
  const searchRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useFiltersInUrl(
    { ...filters, id: selectedId ?? "" },
    { ...KB_DEFAULTS, id: "" },
  );

  const query = useMemo(() => searchParams(filters, limit), [filters, limit]);
  const { data, loading, refreshing, error, refetch } = useKbSearch(query);
  const { data: categories, refetch: refetchCategories } = useFaultCategories();
  const { data: machines } = useApi<Machine[]>("/machines");
  const { data: departments } = useApi<Department[]>("/departments");

  const hits = data?.hits ?? [];
  const querying = filters.q.trim().length > 0;
  const filterCount = activeFilterCount(filters);

  function patch(next: Partial<KbFilters>) {
    setFilters((f) => ({ ...f, ...next }));
    setLimit(PAGE);
  }
  function clearAll() {
    setFilters(KB_DEFAULTS);
    setLimit(PAGE);
  }

  useEffect(() => {
    if (!isDesktop || !data || !querying) return;
    if (data.hits.length > 0 && !data.hits.some((h) => h.id === selectedId)) {
      setSelectedId(data.hits[0]!.id);
    }
  }, [data, isDesktop]);

  const selectedHit = hits.find((h) => h.id === selectedId);
  const prefixes = useMemo(
    () => (selectedHit && querying ? markPrefixes(selectedHit.matched) : []),
    [selectedHit, querying],
  );

  const afterWrite = async () => {
    clearKbSearchCache();
    refetch();
    refetchCategories();
  };
  const { run: mutate } = useMutate(afterWrite);

  function select(id: string) {
    setSelectedId(id);
    if (!isDesktop) setDrawerId(id);
  }
  useEffect(() => {
    if (!isDesktop && selectedId) setDrawerId(selectedId);
  }, [isDesktop]);

  const tagSuggestions = useMemo(() => data?.facets.tag.map((b) => b.value) ?? [], [data]);
  const stats = data?.stats ?? null;

  const sort = effectiveSort(filters);
  const defaultSort = querying ? "relevance" : "recent";

  const header = (
    <div className="space-y-2">
      <h1 className="sr-only">Baza znanja</h1>
      <SearchRow
        multiline
        leading={<PageDate />}
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" strokeWidth={2.1} /> Nov vnos
          </Button>
        }
      >
        <SearchTextarea
          ref={searchRef}
          icon={Search}
          aria-label="Iskanje po bazi znanja"
          placeholder="Opišite težavo ali poiščite rešitev…"
          value={filters.q}
          onChange={(e) => patch({ q: e.target.value.replace(/\n/g, " ") })}
          onKeyDown={(e) => {
            const enter = e.key === "Enter" && !e.shiftKey;
            const atEnd = e.currentTarget.selectionStart === e.currentTarget.value.length;
            if (enter) e.preventDefault();
            if ((enter || (e.key === "ArrowDown" && atEnd)) && hits.length > 0 && isDesktop) {
              e.preventDefault();
              if (!selectedId || !hits.some((h) => h.id === selectedId)) setSelectedId(hits[0]!.id);
              listRef.current?.focus();
            } else if (e.key === "Escape" && filters.q) {
              patch({ q: "" });
            }
          }}
          className="w-full"
          trailing={
            <>
              <span className="xl:hidden">
                <FiltersToggle
                  icon
                  open={facetsOpen}
                  onToggle={() => setFacetsOpen(true)}
                  activeCount={filterCount}
                  controls="knowledge-filters"
                />
              </span>
              <SortMenu
                value={sort}
                querying={querying}
                isDefault={sort === defaultSort}
                onChange={(v) => patch({ sort: v === defaultSort ? "" : v })}
              />
            </>
          }
        />
      </SearchRow>
    </div>
  );

  const resultsBar = (
    <div className="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1.5 pb-3">
      <span className="mr-1 text-sm text-nav-foreground tabular-nums">
        {data ? `${nf.format(data.total)} ${zapisov(data.total)}` : " "}
      </span>
      <ActiveFilters
        filters={filters}
        categories={categories ?? []}
        machines={machines ?? []}
        departments={departments ?? []}
        suggestion={data?.suggestion ?? null}
        onChange={patch}
        onClear={clearAll}
      />
    </div>
  );

  const facets = (
    <KbFacets
      facets={data?.facets ?? null}
      categories={categories ?? []}
      machines={machines ?? []}
      departments={departments ?? []}
      filters={filters}
      onChange={patch}
    />
  );

  const reportHref = useMemo(() => {
    const text = filters.q.trim();
    const qs = new URLSearchParams({ new: "1" });
    if (text) qs.set("newTitle", (text.split(/(?<=[.!?])\s/)[0] ?? text).slice(0, 200));
    if (filters.machineId) qs.set("newMachineId", filters.machineId);
    return `/zahtevki?${qs.toString()}`;
  }, [filters.q, filters.machineId]);

  const empty = (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-inset text-nav-foreground">
        <Stethoscope className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{querying ? `Ničesar za „${filters.q.trim()}“` : "Ni zapisov za te filtre"}</p>
        <p className="max-w-sm text-sm text-nav-foreground">
          {querying
            ? "Poskusite z drugimi besedami ali opišite, kaj se dogaja. Če rešitve ni, prijavite napako."
            : "Odstranite katerega od filtrov."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {data?.suggestion && (
          <Button variant="outline" size="sm" onClick={() => patch({ q: data.suggestion! })}>
            <Sparkles className="size-4" /> Išči „{data.suggestion}“
          </Button>
        )}
        {querying && (
          <Button variant="outline" size="sm" asChild>
            <Link href={reportHref}>
              <Tags className="size-4" /> Prijavi napako
            </Link>
          </Button>
        )}
        {filterCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => patch({ ...KB_DEFAULTS, q: filters.q })}>
            Počisti filtre
          </Button>
        )}
      </div>
    </div>
  );

  const areasRow =
    querying && (data?.areas?.length ?? 0) > 0 ? (
      <div className="flex flex-wrap items-center gap-1.5 px-1 pb-2">
        {data!.areas!.slice(0, 4).map((area) => {
          const cat = categories?.find((c) => c.id === area.id);
          const Icon = cat ? (FAULT_ICON[cat.icon] ?? Shapes) : Shapes;
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => patch({ categoryId: area.id })}
              aria-pressed={filters.categoryId === area.id}
              {...segmentTintProps()}
              className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border bg-field-tinted px-2.5 text-xs transition-colors hover:border-border-row-hover"
            >
              <Icon className="size-3.5 shrink-0 text-nav-foreground" />
              <FadeText>{cat?.name ?? "Kategorija"}</FadeText>
              <span className="shrink-0 text-nav-foreground tabular-nums">{area.share} %</span>
            </button>
          );
        })}
      </div>
    ) : null;

  const similarTickets =
    querying && (data?.tickets?.length ?? 0) > 0 ? (
      <section className="mt-6 flex flex-col gap-3 px-1">
        <SectionTitle>Podobni rešeni ticketi</SectionTitle>
        <ul className="space-y-1">
          {data!.tickets!.map((t) => (
            <li key={t.id}>
              <Link href={`/zahtevki/${t.id}`} {...plateTintProps()} className="-mx-2 block space-y-0.5 rounded-md px-2 py-2">
                <span className="flex items-baseline gap-2 text-sm">
                  <span className="shrink-0 text-nav-foreground tabular-nums">#{t.number}</span>
                  <FadeText className="flex-1 font-medium">{t.title}</FadeText>
                </span>
                <FadeText lines={2} className="text-sm text-nav-foreground">
                  {t.resolution}
                </FadeText>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  const loadMore =
    data && hits.length < data.total ? (
      hits.length < MAX ? (
        <div className="px-3 py-3">
          <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={() => setLimit((l) => Math.min(MAX, l + PAGE))}>
            Pokaži še {Math.min(PAGE, data.total - hits.length)}
          </Button>
        </div>
      ) : (
        <p className="px-3 py-3 text-center text-xs text-nav-foreground">
          Prikazanih je prvih {MAX} od {data.total}. Zožite iskanje ali izberite kategorijo.
        </p>
      )
    ) : null;

  const errorNote = error && (
    <div className="space-y-3 px-3 py-10 text-center">
      <p className="text-sm text-destructive">{error}</p>
      <Button variant="outline" size="sm" onClick={refetch}>
        Poskusi znova
      </Button>
    </div>
  );

  const reader = selectedId ? (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => setSelectedId(null)}
        className="-ml-1 flex items-center gap-1 rounded-sm text-sm text-nav-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Pregled baze znanja
      </button>
    <KbReader
      key={selectedId}
      id={selectedId}
      prefixes={prefixes}
      onEdit={(a) => setEditing(a)}
      onChanged={() => {
        clearKbSearchCache();
        refetch();
      }}
      onNavigate={setSelectedId}
      onFilterTag={(tag) => patch({ tag })}
      onFilterCategory={(categoryId) => patch({ categoryId })}
    />
    </div>
  ) : (
    <KbOverview
      stats={stats}
      onSelect={setSelectedId}
    />
  );

  const PANE = "scroll-fade-y min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:none]! [&::-webkit-scrollbar]:hidden";

  return (
    <div
      className={cn(
        "flex flex-col gap-7",
        "lg:h-[calc(100dvh-1.5rem)] lg:min-h-[36rem]",
      )}
    >
      {header}

      <div className="grid grid-cols-1 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(20rem,1fr)_minmax(20rem,1fr)] xl:grid-cols-[15.5rem_minmax(22rem,1fr)_minmax(24rem,1fr)] 2xl:grid-cols-[16rem_minmax(24rem,1fr)_minmax(26rem,1.2fr)]">
        <aside className={cn(PANE, "hidden pr-3 xl:block")}>{facets}</aside>

        <section
          aria-label="Zadetki"
          className={cn("flex flex-col lg:min-h-0 lg:pr-4 xl:border-l xl:pl-3")}
        >
          {resultsBar}
          <div className={cn(PANE, "lg:flex-1")}>
            {error ? (
              errorNote
            ) : (
              <KbResultList
                hits={hits}
                selectedId={isDesktop ? selectedId : null}
                onSelect={select}
                querying={querying}
                ranked={querying && sort === "relevance"}
                loading={loading}
                refreshing={refreshing}
                empty={empty}
                header={areasRow}
                footer={
                  <>
                    {loadMore}
                    {similarTickets}
                    {querying && (
                      <p className="mt-4 px-1 pb-2 text-sm text-nav-foreground">
                        Ni pravega zadetka?{" "}
                        <Link href={reportHref} className="text-foreground underline-offset-2 hover:underline">
                          Prijavi napako
                        </Link>
                      </p>
                    )}
                  </>
                }
                listRef={listRef}
                onExitTop={() => searchRef.current?.focus()}
                onClear={() => setSelectedId(null)}
              />
            )}
          </div>
        </section>

        <section
          aria-label="Bralnik"
          className={cn(PANE, "@container hidden lg:block")}
        >
          <div className="pr-2 pb-8 pl-6 xl:pl-8">{reader}</div>
        </section>
      </div>

      <Drawer direction="left" open={facetsOpen} onOpenChange={setFacetsOpen}>
        <DrawerContent className="data-[vaul-drawer-direction=left]:sm:max-w-xs">
          <DrawerTitle className="sr-only">Filtri baze znanja</DrawerTitle>
          <DrawerDescription className="sr-only">Kategorije, izvor, vrsta, sredstvo in oznake.</DrawerDescription>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5">{facets}</div>
        </DrawerContent>
      </Drawer>

      <Drawer
        direction="right"
        open={drawerId !== null}
        onOpenChange={(o) => {
          if (o) return;
          setDrawerId(null);
          if (!isDesktop) setSelectedId(null);
        }}
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
          <DrawerTitle className="sr-only">Zapis baze znanja</DrawerTitle>
          <DrawerDescription className="sr-only">Celoten zapis s sorodnimi zapisi.</DrawerDescription>
          <div className="scroll-fade min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-10">
            {drawerId && (
              <KbReader
                key={drawerId}
                id={drawerId}
                prefixes={
                  querying ? markPrefixes(hits.find((h) => h.id === drawerId)?.matched ?? []) : []
                }
                onEdit={(a) => {
                  setDrawerId(null);
                  setEditing(a);
                }}
                onChanged={() => {
                  clearKbSearchCache();
                  refetch();
                }}
                onNavigate={setDrawerId}
                onFilterTag={(tag) => {
                  setDrawerId(null);
                  patch({ tag });
                }}
                onFilterCategory={(categoryId) => {
                  setDrawerId(null);
                  patch({ categoryId });
                }}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <MobileBarActions>
        <MobileFilters title="Filtri baze znanja" activeCount={filterCount} onClear={() => patch({ ...KB_DEFAULTS, q: filters.q })}>
          {facets}
        </MobileFilters>
        <BarCircle label="Nov vnos" variant="primary" onClick={() => setAddOpen(true)}>
          <Plus strokeWidth={2.1} />
        </BarCircle>
      </MobileBarActions>

      <KbEntryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Nov vnos"
        submitLabel="Dodaj vnos"
        machines={machines ?? []}
        departments={departments ?? []}
        categories={categories ?? []}
        tagSuggestions={tagSuggestions}
        onSubmit={(values) =>
          mutate(
            () =>
              apiPost<KnowledgeArticle>("/knowledge", values).then((created) => {
                if (isDesktop) setSelectedId(created.id);
              }),
            "Vnos dodan",
          ).then(() => setAddOpen(false))
        }
      />
      <KbEntryDialog
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
        title={editing?.ticketId ? "Razvrsti zapis" : "Uredi vnos"}
        submitLabel="Shrani spremembe"
        initial={editing ?? undefined}
        machines={machines ?? []}
        departments={departments ?? []}
        categories={categories ?? []}
        tagSuggestions={tagSuggestions}
        onSubmit={(values) =>
          editing &&
          mutate(() => apiPatch(`/knowledge/${editing.id}`, values), "Vnos posodobljen").then(() => {
            const id = editing.id;
            setEditing(null);
            if (selectedId === id) {
              setSelectedId(null);
              window.setTimeout(() => setSelectedId(id), 0);
            }
          })
        }
        onRequestDelete={() => editing && setDeleting(editing)}
      />
      <KbDeleteDialog
        open={deleting !== null}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={deleting?.title ?? ""}
        onConfirm={() =>
          deleting &&
          mutate(() => apiDelete(`/knowledge/${deleting.id}`), "Vnos izbrisan").then(() => {
            if (selectedId === deleting.id) setSelectedId(null);
            setDeleting(null);
            setEditing(null);
          })
        }
      />
    </div>
  );
}

function filtersFromParams(params: { get(key: string): string | null }): KbFilters {
  const f: KbFilters = { ...KB_DEFAULTS };
  for (const key of KB_FILTER_KEYS) {
    const v = params.get(key);
    if (v) f[key] = v;
  }
  if (f.sort && !(KB_SORTS as readonly string[]).includes(f.sort)) f.sort = "";
  if (f.type && !(f.type in TYPE_META)) f.type = "";
  const show = params.get("show");
  if (show === "pinned") f.pinned = "1";
  if (show === "ticket" || show === "manual") f.source = show;
  return f;
}

function ActiveFilters({
  filters,
  categories,
  machines,
  departments,
  suggestion,
  onChange,
  onClear,
}: {
  filters: KbFilters;
  categories: { id: string; name: string; icon: string }[];
  machines: Machine[];
  departments: Department[];
  suggestion: string | null;
  onChange: (patch: Partial<KbFilters>) => void;
  onClear: () => void;
}) {
  const chips: { key: string; label: string; clear: Partial<KbFilters> }[] = [];
  if (filters.categoryId) {
    const c = categories.find((x) => x.id === filters.categoryId);
    chips.push({
      key: "category",
      label: filters.categoryId === "none" ? "Brez kategorije" : (c?.name ?? "Kategorija"),
      clear: { categoryId: "" },
    });
  }
  if (filters.source) chips.push({ key: "source", label: SOURCE_LABEL[filters.source] ?? filters.source, clear: { source: "" } });
  if (filters.pinned) chips.push({ key: "pinned", label: "Pripeti", clear: { pinned: "" } });
  if (filters.type) chips.push({ key: "type", label: TYPE_META[filters.type as TicketType]?.label ?? filters.type, clear: { type: "" } });
  if (filters.machineId) {
    const m = machines.find((x) => x.id === filters.machineId);
    chips.push({ key: "machine", label: m ? `${m.brand} ${m.model}` : "Sredstvo", clear: { machineId: "" } });
  }
  if (filters.departmentId) {
    const d = departments.find((x) => x.id === filters.departmentId);
    chips.push({ key: "department", label: d?.name ?? "Oddelek", clear: { departmentId: "" } });
  }
  if (filters.tag) chips.push({ key: "tag", label: `#${filters.tag}`, clear: { tag: "" } });

  if (chips.length === 0 && !suggestion) return null;
  return (
    <div className="contents text-sm">
      {suggestion && (
        <span className="mr-2 flex items-center gap-1.5 text-nav-foreground">
          <Sparkles className="size-4" /> Ali ste mislili
          <button
            type="button"
            onClick={() => onChange({ q: suggestion })}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {suggestion}
          </button>
          ?
        </span>
      )}
      {chips.map((chip) => {
        const Icon =
          chip.key === "category" && filters.categoryId !== "none"
            ? FAULT_ICON[categories.find((c) => c.id === filters.categoryId)?.icon as keyof typeof FAULT_ICON]
            : null;
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onChange(chip.clear)}
            aria-label={`Odstrani filter ${chip.label}`}
            {...segmentTintProps()}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-field-tinted pr-2 pl-2.5 text-xs transition-colors hover:border-border-row-hover"
          >
            {Icon && <Icon className="size-3.5 text-nav-foreground" />}
            {chip.label}
            <X className="size-3 text-nav-foreground" />
          </button>
        );
      })}
      {chips.length > 1 && (
        <button type="button" onClick={onClear} className="ml-1 text-xs text-nav-foreground transition-colors hover:text-foreground">
          Počisti vse
        </button>
      )}
    </div>
  );
}
