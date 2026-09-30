"use client";

import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Info, List, Network, LayoutList, Tags, User, CircleDot, CalendarDays, CheckCircle2, Wrench, Activity } from "@/components/icons";
import { PageDate } from "@/components/page-date";
import { DepartmentBadge } from "@/components/department-badge";
import { createTicketSchema, ticketStatusSchema, ticketTypeSchema } from "@servis-track/shared";
import { apiPost, ApiError } from "@/lib/api";
import { useApi, useApiList } from "@/lib/useApi";
import { useDeferred } from "@/lib/use-deferred";
import { useAuth } from "@/lib/auth";
import { useIsDesktop } from "@/lib/use-media";
import { useListView } from "@/lib/view-preference";
import { validateForm, type FieldErrors } from "@/lib/form";
import { ticketLabel, type Department, type Machine, type Ticket } from "@/lib/types";
import { machineOptions } from "@/lib/machines";
import { formatDate } from "@/lib/format";
import {
  PRIORITY_INLINE_OPTIONS,
  StatusBadge,
  ActivityBadge,
  STATUS_META,
  TYPE_META,
  TYPE_OPTIONS,
} from "@/components/badges";
import {
  FilterRevealRow,
  FiltersClearInField,
  FiltersToggle,
  ResultsSummary,
  SearchRow,
  optionLabel,
} from "@/components/filter-bar";
import { MobileFilters } from "@/components/filter-dialog";
import { TableEmpty } from "@/components/table-empty";
import {
  RowCheckbox,
  SelectAllCheckbox,
  TicketContextMenu,
  targetsFor,
  useTicketSelection,
} from "@/components/ticket-bulk-actions";
import { NONE, ScopeRows } from "@/components/scope-picker";
import { BarCircle, MobileBarActions } from "@/components/mobile-action-bar";
import { TicketCard, TicketCardSkeleton } from "@/components/ticket-card";
import { UserAvatar } from "@/components/user-avatar";
import { onTintCursorMoveRow } from "@/components/hover-tint";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/search-input";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { FlashInput } from "@/components/ui/flash-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TABLE_FRAME,
  EmptyCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PageStep } from "@/components/ui/pagination";
import { useDevicePrefs } from "@/lib/device-prefs";
import { cn } from "@/lib/utils";

const ALL = "ALL";

const CARD_PAGE_SIZE = 24;

const isFinished = (t: Ticket) => t.status === "RESOLVED";

const COLUMNS = 8;

function FinishedDivider({ count }: { count: number }) {
  return (
    <div className="flex select-none items-center gap-4 h-0 text-base text-group-heading">
      <span className="h-[var(--hairline,1px)] flex-1 bg-foreground/0" />
      <span className="shrink-0">Zaključeni ticketi ({count})</span>
      <span className="h-[var(--hairline,1px)] flex-1 bg-foreground/0" />
    </div>
  );
}

const STATUS_FILTER_OPTIONS: ComboboxOption[] = [
  { value: ALL, label: "Vsi statusi" },
  ...ticketStatusSchema.options.map((s) => ({
    value: s,
    label: STATUS_META[s].label,
    icon: STATUS_META[s].icon,
  })),
];
const TYPE_FILTER_OPTIONS: ComboboxOption[] = [
  { value: ALL, label: "Vse vrste" },
  ...TYPE_OPTIONS,
];

function fromParam(raw: string | null, schema: { safeParse: (v: unknown) => { success: boolean } }) {
  if (!raw) return ALL;
  return schema.safeParse(raw).success ? raw : ALL;
}

export default function TicketsPage() {
  return (
    <Suspense fallback={null}>
      <TicketsPageInner />
    </Suspense>
  );
}

function TicketsPageInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>(() => fromParam(searchParams.get("status"), ticketStatusSchema));
  const [type, setType] = useState<string>(() => fromParam(searchParams.get("type"), ticketTypeSchema));
  const [departmentId, setDepartmentId] = useState<string>(() => searchParams.get("departmentId") ?? ALL);
  const [machineFilter, setMachineFilter] = useState<string>(() => searchParams.get("machineId") ?? ALL);
  const [filtersOpen, setFiltersOpen] = useState(() =>
    [status, type, departmentId, machineFilter].some((v) => v !== ALL),
  );
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [debounced, setDebounced] = useState(() => searchParams.get("q")?.trim() ?? "");
  const [page, setPage] = useState(() => {
    const n = Number(searchParams.get("page"));
    return Number.isInteger(n) && n > 1 ? n - 1 : 0;
  });
  const [newOpen, setNewOpen] = useState(() => searchParams.get("new") === "1");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const { view } = useListView("tickets");
  const isDesktop = useIsDesktop(true);
  const showCards = !isDesktop || view === "CARDS";
  const devicePrefs = useDevicePrefs();
  const pageSize = showCards ? CARD_PAGE_SIZE : devicePrefs.pageSize;
  const statusDefaultApplied = useRef(false);
  useEffect(() => {
    if (statusDefaultApplied.current || searchParams.get("status")) return;
    if (devicePrefs.ticketStatus === "all") return;
    statusDefaultApplied.current = true;
    setStatus(devicePrefs.ticketStatus);
    setFiltersOpen(true);
  }, [devicePrefs.ticketStatus, searchParams]);

  const { data: departments } = useApi<Department[]>("/departments");
  const { data: machines } = useApi<Machine[]>("/machines");
  const router = useRouter();

  function openTicket(id: string, e: React.MouseEvent | React.KeyboardEvent) {
    const href = `/zahtevki/${id}`;
    if (("button" in e && e.button === 1) || e.metaKey || e.ctrlKey || e.shiftKey) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(href);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 450);
    return () => clearTimeout(t);
  }, [q]);

  const firstFilterRun = useRef(true);
  useEffect(() => {
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
      return;
    }
    setPage(0);
  }, [status, type, departmentId, machineFilter, debounced]);

  useEffect(() => {
    const nextStatus = fromParam(searchParams.get("status"), ticketStatusSchema);
    const nextType = fromParam(searchParams.get("type"), ticketTypeSchema);
    const nextDept = searchParams.get("departmentId") ?? ALL;
    const nextMachine = searchParams.get("machineId") ?? ALL;
    const nextQ = searchParams.get("q") ?? "";
    const rawPage = Number(searchParams.get("page"));
    const nextPage = Number.isInteger(rawPage) && rawPage > 1 ? rawPage - 1 : 0;
    if (nextStatus !== status) setStatus(nextStatus);
    if (nextType !== type) setType(nextType);
    if (nextDept !== departmentId) setDepartmentId(nextDept);
    if (nextMachine !== machineFilter) setMachineFilter(nextMachine);
    if (nextQ !== q.trim()) {
      setQ(nextQ);
      setDebounced(nextQ);
    }
    if (nextPage !== page) setPage(nextPage);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setNewOpen(true);
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (status !== ALL) next.set("status", status);
    if (type !== ALL) next.set("type", type);
    if (departmentId !== ALL) next.set("departmentId", departmentId);
    if (machineFilter !== ALL) next.set("machineId", machineFilter);
    if (debounced) next.set("q", debounced);
    if (page > 0) next.set("page", String(page + 1));
    const qs = next.toString();
    if (qs === window.location.search.replace(/^\?/, "")) return;
    window.history.replaceState(null, "", qs ? `/zahtevki?${qs}` : "/zahtevki");
  }, [status, type, departmentId, machineFilter, debounced, page]);

  const filterQs = new URLSearchParams();
  if (status !== ALL) filterQs.set("status", status);
  if (type !== ALL) filterQs.set("type", type);
  if (departmentId !== ALL) filterQs.set("departmentId", departmentId);
  if (machineFilter !== ALL) filterQs.set("machineId", machineFilter);
  if (debounced) filterQs.set("q", debounced);

  const qs = new URLSearchParams(filterQs);
  qs.set("limit", String(pageSize));
  qs.set("offset", String(page * pageSize));
  const { items: fetched, total: fetchedTotal, loading, refreshing, error, refetch } = useApiList<Ticket>(
    `/tickets?${qs.toString()}`,
  );
  const dimmed = useDeferred(refreshing && !loading, 400);

  const finishedQs = new URLSearchParams(filterQs);
  finishedQs.set("status", "RESOLVED");
  finishedQs.set("limit", "1");
  const { total: finishedTotal, refetch: refetchFinished } = useApiList<Ticket>(
    status === ALL ? `/tickets?${finishedQs.toString()}` : null,
  );
  const finishedCount = status === ALL ? finishedTotal : fetchedTotal;
  const hideResolved = !devicePrefs.showResolved && status === ALL;
  const items = hideResolved ? fetched.filter((t) => !isFinished(t)) : fetched;

  const { isAdmin } = useAuth();
  const selection = useTicketSelection(items);
  const [menuTargets, setMenuTargets] = useState<Ticket[]>([]);
  const columns = COLUMNS + (isAdmin ? 1 : 0);
  const total =
    hideResolved && finishedTotal != null ? Math.max(0, fetchedTotal - finishedTotal) : fetchedTotal;

  const finishedStart = items.findIndex(isFinished);

  const pageCount = Math.ceil(total / pageSize);
  const filtersActive =
    status !== ALL ||
    type !== ALL ||
    departmentId !== ALL ||
    machineFilter !== ALL ||
    q !== "";
  const DEPARTMENT_FILTER_OPTIONS: ComboboxOption[] = [
    { value: ALL, label: "Vsi oddelki" },
    ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];
  const MACHINE_FILTER_OPTIONS = machineOptions(machines, {
    value: ALL,
    label: "Vsa sredstva",
  });

  const activeFilterCount = [status, type, departmentId, machineFilter].filter(
    (v) => v !== ALL,
  ).length;

  function clearFilters() {
    setStatus(ALL);
    setType(ALL);
    setDepartmentId(ALL);
    setMachineFilter(ALL);
    setQ("");
  }

  const activeFilterLabels = [
    status !== ALL && optionLabel(STATUS_FILTER_OPTIONS, status),
    type !== ALL && optionLabel(TYPE_FILTER_OPTIONS, type),
    departmentId !== ALL && optionLabel(DEPARTMENT_FILTER_OPTIONS, departmentId),
    machineFilter !== ALL && optionLabel(MACHINE_FILTER_OPTIONS, machineFilter),
  ].filter((l): l is string => typeof l === "string");
  const resultsSummary =
    loading && items.length === 0 ? null : (
      <ResultsSummary page={page} pageSize={pageSize} total={total} filters={activeFilterLabels} />
    );

  const FILTER_WIDTH = "w-[13.75rem]";

  const filterControls = (
    <>
      <Combobox
        value={status}
        onChange={setStatus}
        options={STATUS_FILTER_OPTIONS}
        icon={Info}
        className={FILTER_WIDTH}
      />
      <Combobox
        value={type}
        onChange={setType}
        options={TYPE_FILTER_OPTIONS}
        icon={List}
        className={FILTER_WIDTH}
      />
      <Combobox
        value={departmentId}
        onChange={setDepartmentId}
        options={DEPARTMENT_FILTER_OPTIONS}
        icon={Network}
        searchable
        searchPlaceholder="Iskanje oddelkov…"
        listClassName="max-h-[22rem]"
        className={FILTER_WIDTH}
      />
      <Combobox
        value={machineFilter}
        onChange={setMachineFilter}
        options={MACHINE_FILTER_OPTIONS}
        icon={LayoutList}
        searchable
        searchPlaceholder="Iskanje sredstev…"
        listClassName="max-h-[min(36rem,60vh)]"
        className={FILTER_WIDTH}
      />
    </>
  );

  return (
    <div className="space-y-6 ">
      <NewTicketDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        initialTitle={searchParams.get("newTitle") ?? undefined}
        initialMachineId={searchParams.get("newMachineId") ?? undefined}
        onCreated={() => {
          setNewOpen(false);
          void refetch();
        }}
      />

      <div className="space-y-3">
        <SearchRow
          leading={
            isAdmin && selection.count > 0 ? (
              <span className="flex items-center gap-2 text-sm leading-9">
                <span className="font-medium tabular-nums">Izbrano: {selection.count}</span>
                <span className="text-nav-foreground">· desni klik za dejanja</span>
                <Button variant="ghost" size="sm" onClick={selection.clear}>
                  Počisti
                </Button>
              </span>
            ) : (
              <PageDate />
            )
          }
          action={
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="size-4" strokeWidth={2.1} /> Nov ticket
            </Button>
          }
        >
          <SearchInput
            aria-label="Iskanje ticketov"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full"
            trailing={
              <>
                <FiltersClearInField active={filtersActive} onClear={clearFilters} />
                <FiltersToggle
                  icon
                  open={filtersOpen}
                  onToggle={() => setFiltersOpen((o) => !o)}
                  activeCount={activeFilterCount}
                  controls="ticket-filters"
                />
              </>
            }
          />
        </SearchRow>

        <FilterRevealRow
          id="ticket-filters"
          open={filtersOpen}
          summary={
            <span className="flex items-center gap-2">
              <PageStep bare direction="prev" page={page} pageCount={pageCount} onPageChange={setPage} />
              {resultsSummary}
              <PageStep bare direction="next" page={page} pageCount={pageCount} onPageChange={setPage} />
            </span>
          }
          summaryAlign="center"
          sidesWithFilters
          start={<PageStep direction="prev" page={page} pageCount={pageCount} onPageChange={setPage} />}
          end={<PageStep direction="next" page={page} pageCount={pageCount} onPageChange={setPage} />}
        >
          {filterControls}
        </FilterRevealRow>

        <MobileBarActions>
          <MobileFilters
            title="Filtri ticketov"
            activeCount={activeFilterCount}
            onClear={clearFilters}
          >
            {filterControls}
          </MobileFilters>
          <BarCircle label="Nov ticket" variant="primary" onClick={() => setNewOpen(true)}>
            <Plus strokeWidth={2.1} />
          </BarCircle>
        </MobileBarActions>
      </div>

      {showCards && (
        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
            "transition-opacity duration-200",
            dimmed && "opacity-60",
          )}
        >
          {loading && Array.from({ length: 6 }).map((_, i) => <TicketCardSkeleton key={i} />)}

          {!loading &&
            !error &&
            items.map((t, i) => (
              <Fragment key={t.id}>
                {i === finishedStart && (
                  <div className="col-span-full py-2">
                    <FinishedDivider count={finishedCount} />
                  </div>
                )}
                <div className="h-full">
                  <TicketCard
                    ticket={t}
                    onOpen={openTicket}
                  />
                </div>
              </Fragment>
            ))}
        </div>
      )}

      {showCards && !loading && error && (
        <div className="py-10 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={refetch}>
            Poskusi znova
          </Button>
        </div>
      )}
      {showCards && !loading && !error && items.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Ni ticketov, ki bi ustrezali filtrom.
        </p>
      )}

      {!showCards && (
      <div className={TABLE_FRAME}>
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-10 border-r-0 pr-0">
                  <SelectAllCheckbox selection={selection} />
                </TableHead>
              )}
              <TableHead icon={Tags}>Ticket</TableHead>
              <TableHead icon={CircleDot}>Status</TableHead>
              <TableHead icon={Network}>Oddelek</TableHead>
              <TableHead icon={User}>Prijavitelj</TableHead>
              <TableHead icon={CalendarDays}>Ustvarjeno</TableHead>
              <TableHead icon={Activity}>Aktivnost</TableHead>
              <TableHead icon={Wrench}>Serviser</TableHead>
              <TableHead icon={CheckCircle2}>Zaključeno</TableHead>
            </TableRow>
          </TableHeader>
          <TicketContextMenu
            enabled={isAdmin}
            targets={menuTargets}
            selection={selection}
            onDone={() => {
              void refetch();
              void refetchFinished();
            }}
          >
          <TableBody
            className={cn("transition-opacity duration-200", dimmed && "opacity-60")}
          >
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="animate-skeleton-appear">
                  {Array.from({ length: columns }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && error && (
              <TableRow>
                <TableCell colSpan={columns} className="py-10 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={refetch}
                  >
                    Poskusi znova
                  </Button>
                </TableCell>
              </TableRow>
            )}

            {!loading && !error && items.length === 0 && (
              <TableEmpty colSpan={columns}>Ni ticketov, ki bi ustrezali filtrom.</TableEmpty>
            )}

            {!loading &&
              !error &&
              items.map((t, i) => (
                <Fragment key={t.id}>
                  <TableRow
                    role="link"
                    tabIndex={0}
                    aria-label={ticketLabel(t, TYPE_META[t.type].label)}
                    zebra={i}
                    data-row-tint="neutral"
                    onPointerMove={onTintCursorMoveRow}
                    className="text-muted-foreground focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-ring"
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse") setHoveredRow(t.id);
                    }}
                    onPointerLeave={() => setHoveredRow((h) => (h === t.id ? null : h))}
                    onFocus={() => setHoveredRow(t.id)}
                    onBlur={() => setHoveredRow((h) => (h === t.id ? null : h))}
                    onClick={(e) => openTicket(t.id, e)}
                    onContextMenu={isAdmin ? () => setMenuTargets(targetsFor(t, selection)) : undefined}
                    data-state={selection.has(t.id) ? "selected" : undefined}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openTicket(t.id, e);
                    }}
                    onAuxClick={(e) => {
                      if (e.button === 1) openTicket(t.id, e);
                    }}
                  >
                    {isAdmin && (
                      <TableCell
                        className="w-10 border-r-0 pr-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          selection.toggle(t.id);
                        }}
                      >
                        <RowCheckbox ticket={t} selection={selection} />
                      </TableCell>
                    )}
                    <TableCell className="max-w-[34rem]">
                      {ticketLabel(t, TYPE_META[t.type].label)}
                      {t.machineDown && !isFinished(t) && (
                        <span className="text-priority-high"> · stoji</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={t.status}
                        animate={hoveredRow === t.id}
                        className={cn(
                          !isFinished(t) && t.priority === "HIGH" && "text-priority-high",
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      {t.department ? <DepartmentBadge department={t.department} /> : <EmptyCell />}
                    </TableCell>
                    <TableCell>
                      {t.reporter ? (
                        <span className="flex items-center gap-2">
                          <UserAvatar
                            user={{
                              id: t.reporter.id,
                              name: t.reporter.name,
                              username: t.reporter.username,
                              hasImage: t.reporter.image != null,
                              imageUpdatedAt: t.reporter.image?.updatedAt ?? null,
                            }}
                            className="size-6"
                            iconClassName="size-3.5"
                          />
                          <span className="truncate">
                            {t.reporter.name ?? t.reporter.username}
                          </span>
                        </span>
                      ) : (
                        (t.reporterName ?? <EmptyCell />)
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(t.createdAt)}</TableCell>
                    <TableCell>
                      <ActivityBadge active={!isFinished(t)} />
                    </TableCell>
                    <TableCell>{t.assignedServicer?.name ?? <EmptyCell />}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {t.resolvedAt ? formatDate(t.resolvedAt) : <EmptyCell />}
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
          </TableBody>
          </TicketContextMenu>
        </Table>
      </div>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

function NewTicketDialog({
  open,
  onOpenChange,
  onCreated,
  initialTitle,
  initialMachineId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  initialTitle?: string;
  initialMachineId?: string;
}) {
  const { user } = useAuth();
  const { data: departments } = useApi<Department[]>("/departments");
  const { data: machines } = useApi<Machine[]>("/machines");

  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("MACHINE");
  const [highPriority, setHighPriority] = useState(false);
  const [machineDown, setMachineDown] = useState(false);
  const [machineId, setMachineId] = useState(NONE);
  const [departmentId, setDepartmentId] = useState(NONE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialTitle) setTitle(initialTitle);
    if (initialMachineId) {
      setType("MACHINE");
      setMachineId(initialMachineId);
    }
  }, [open]);

  const isMachine = type === "MACHINE";

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    if (!open) return;
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const reporterName = user?.name ?? user?.username ?? <EmptyCell />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values = {
      title: title.trim(),
      type,
      priority: highPriority ? "HIGH" : "NORMAL",
      machineDown: isMachine && machineDown ? true : undefined,
      machineId: isMachine && machineId !== NONE ? machineId : undefined,
      departmentId: !isMachine && departmentId !== NONE ? departmentId : undefined,
      reporterId: user?.id,
    };
    const parsed = validateForm(createTicketSchema, values);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    if (isMachine && machineId === NONE) {
      setErrors({ machineId: "pick the machine this fault is about" });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await apiPost<Ticket>("/tickets", parsed.data);
      toast.success("Ticket ustvarjen");
      setTitle("");
      setType("MACHINE");
      setHighPriority(false);
      setMachineDown(false);
      setMachineId(NONE);
      setDepartmentId(NONE);
      onCreated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ticketa ni bilo mogoče ustvariti");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[26rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="size-5 shrink-0" />
            Nov ticket
          </DialogTitle>
          <DialogDescription className="sr-only">Prijava nove napake.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <FlashInput
              aria-label="Kaj je narobe?"
              placeholder="Kaj je narobe?"
              value={title}
              aria-invalid={!!errors.title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <PropertyList>
            <PropertyRow label="Vrsta">
              <Combobox variant="inline" value={type} onChange={setType} options={TYPE_OPTIONS} />
            </PropertyRow>

            <PropertyRow label="Prednost">
              <Combobox
                variant="inline"
                value={highPriority ? "HIGH" : "NORMAL"}
                onChange={(v) => setHighPriority(v === "HIGH")}
                options={PRIORITY_INLINE_OPTIONS}
              />
            </PropertyRow>

            <ScopeRows
              isMachine={isMachine}
              machines={machines}
              departments={departments}
              machineId={machineId}
              onMachineChange={setMachineId}
              departmentId={departmentId}
              onDepartmentChange={setDepartmentId}
              machineLead="Izberite stroj…"
              error={errors.machineId}
            />
            {isMachine && (
              <PropertyRow label="Stroj stoji">
                <div className="flex h-8 items-center">
                  <Switch checked={machineDown} onCheckedChange={setMachineDown} aria-label="Stroj stoji" />
                </div>
              </PropertyRow>
            )}

            <div className="col-span-2 py-1">
              <Separator />
            </div>
            <PropertyRow label="Prijavil">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <User className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{reporterName}</span>
                <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                  {now ? now.toLocaleTimeString() : "—"}
                </span>
              </span>
            </PropertyRow>
          </PropertyList>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Prekliči
            </Button>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Ustvarjanje…" : "Ustvari ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
