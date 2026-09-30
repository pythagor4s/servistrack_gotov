"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  NotebookPen,
  Plus,
  Wrench,
} from "@/components/icons";

import { useAuth } from "@/lib/auth";
import { useApi, useApiList } from "@/lib/useApi";
import { apiDelete, apiPost } from "@/lib/api";
import { useMutate } from "@/lib/use-mutate";
import { weeklyBacklog, weeklyFlow } from "@/lib/backlog";
import { dayCountLabel, formatDate, formatDateTime, formatDuration, greeting, hourCountLabel } from "@/lib/format";
import {
  CALENDAR_CHANGED,
  isOverdue,
  notifyCalendarChanged,
  overdueRange,
  todayLocal,
} from "@/lib/calendar";
import type { CalendarTasksResponse, KnowledgeArticle, Machine, Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FromTicketBadge, STATUS_META } from "@/components/badges";
import { shortDate } from "@/components/detail-parts";
import { FadeText } from "@/components/ui/fade-text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageDate } from "@/components/page-date";
import { Kpi, KpiStrip } from "@/components/kpi-strip";
import { BacklogChart, shortDay } from "@/components/dashboard/backlog-chart";
import { TopContributors, type ContributorMetric } from "@/components/dashboard/top-contributors";
import { WeekTaskList } from "@/components/calendar/week-task-list";
import { NewTaskDialog } from "@/components/calendar/new-task-dialog";
import type { CalendarItem } from "@/components/calendar/task-chip";
import { PAGE_ASIDE, PAGE_ASIDE_INNER, PAGE_MAIN, PAGE_WITH_ASIDE } from "@/lib/page-layout";
import { BarCircle, MobileBarActions } from "@/components/mobile-action-bar";

const WEEKS = 12;
const FLOW_WEEKS = 4;
const OPEN_ROWS = 8;
const RECENT_ROWS = 5;
const MEDIAN_SAMPLE = 30;
const ALL_TASKS = () => true;

const ROW = "-mx-2 flex h-9 items-center gap-3 rounded-md px-2 text-sm transition-colors hover:bg-surface-hover";
const SIDE = "inline-flex shrink-0 items-center gap-1.5 text-xs text-nav-foreground tabular-nums";
const LINK = "text-sm text-nav-foreground transition-colors hover:text-foreground";

function durationParts(ms: number): { value: string; unit: string } {
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) {
    const h = Math.max(1, hours);
    return { value: String(h), unit: hourCountLabel(h) };
  }
  const days = Math.floor(hours / 24);
  return { value: String(days), unit: dayCountLabel(days) };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const [now, setNow] = useState(() => new Date());
  const [today, setToday] = useState(todayLocal);
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setToday(todayLocal());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const [taskOpen, setTaskOpen] = useState(false);
  const [contributorMetric, setContributorMetric] = useState<ContributorMetric>("reports");

  const { items, loading, error } = useApiList<Ticket>("/tickets?limit=100");
  const { data: articles, loading: kbLoading } = useApi<KnowledgeArticle[]>("/knowledge");
  const { from, to } = overdueRange(today);
  const { data: calendar, refetch: refetchCalendar } = useApi<CalendarTasksResponse>(
    isAdmin ? `/calendar/tasks?from=${from}&to=${to}` : null,
  );
  useEffect(() => {
    const onChange = () => void refetchCalendar();
    window.addEventListener(CALENDAR_CHANGED, onChange);
    return () => window.removeEventListener(CALENDAR_CHANGED, onChange);
  }, [refetchCalendar]);

  const { run } = useMutate(async () => notifyCalendarChanged());
  const toggleTask = (item: CalendarItem, done: boolean) =>
    run(
      () =>
        done
          ? apiPost(`/calendar/tasks/${item.task.id}/completions`, { date: item.occurrence.date })
          : apiDelete(`/calendar/tasks/${item.task.id}/completions/${item.occurrence.date}`),
      done ? "Označeno kot opravljeno" : "Oznaka odstranjena",
    );

  const stats = useMemo(() => {
    const open = items.filter((t) => t.status !== "RESOLVED");
    const resolved = items
      .filter((t) => t.status === "RESOLVED" && t.resolvedAt)
      .sort((a, b) => b.resolvedAt!.localeCompare(a.resolvedAt!));
    const sample = resolved.slice(0, MEDIAN_SAMPLE);
    const mid = median(
      sample.map((t) => Date.parse(t.resolvedAt!) - Date.parse(t.createdAt)).filter((ms) => ms >= 0),
    );

    const byMachine = new Map<string, { machine: Machine; tickets: Ticket[] }>();
    for (const t of open) {
      if (!t.machine) continue;
      const entry = byMachine.get(t.machine.id) ?? { machine: t.machine, tickets: [] };
      entry.tickets.push(t);
      byMachine.set(t.machine.id, entry);
    }
    const machines = [...byMachine.values()].sort(
      (a, b) =>
        Number(b.tickets.some((t) => t.machineDown)) - Number(a.tickets.some((t) => t.machineDown)) ||
        b.tickets.length - a.tickets.length ||
        Number(b.tickets.some((t) => t.priority === "HIGH")) - Number(a.tickets.some((t) => t.priority === "HIGH")),
    );

    const visits = open
      .filter((t) => t.servicerEta)
      .sort((a, b) => a.servicerEta!.localeCompare(b.servicerEta!));

    const attention = [...open].sort(
      (a, b) =>
        Number(b.machineDown) - Number(a.machineDown) ||
        Number(b.priority === "HIGH") - Number(a.priority === "HIGH") ||
        a.createdAt.localeCompare(b.createdAt),
    );

    return {
      open,
      attention,
      visits,
      high: open.filter((t) => t.priority === "HIGH").length,
      inProgress: open.filter((t) => t.status === "IN_PROGRESS").length,
      coming: open.filter((t) => t.status === "SERVICER_COMING").length,
      resolved,
      sampleSize: sample.length,
      median: mid,
      machines,
    };
  }, [items]);

  const backlog = useMemo(() => weeklyBacklog(items, WEEKS), [items]);
  const flow = useMemo(() => weeklyFlow(items, FLOW_WEEKS), [items]);
  const flowNew = flow.reduce((s, w) => s + w.opened, 0);
  const flowResolved = flow.reduce((s, w) => s + w.resolved, 0);

  const overdueCount = useMemo(() => {
    if (!calendar) return null;
    const byId = new Map(calendar.tasks.map((t) => [t.id, t]));
    return calendar.occurrences.filter((o) => {
      const task = byId.get(o.taskId);
      return task ? isOverdue(o, task, today) : false;
    }).length;
  }, [calendar, today]);

  const recentKb = useMemo(
    () => [...(articles ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, RECENT_ROWS),
    [articles],
  );

  if (!user) return null;
  const firstName = (user.name ?? user.username).split(" ")[0];
  const openTitle = isAdmin ? "Odprti ticketi" : "Moji odprti ticketi";
  const medianParts = stats.median !== null ? durationParts(stats.median) : null;
  const machinesDown = stats.machines.filter((m) => m.tickets.some((t) => t.machineDown)).length;

  return (
    <div
      className={cn(
        isAdmin ? PAGE_WITH_ASIDE : "grid grid-cols-1 gap-10 lg:flex-1",
      )}
    >
      <div className={cn("min-w-0", isAdmin && PAGE_MAIN)}>
        <div className="space-y-8">
          <header className="space-y-6">
            <div className="flex min-h-9 items-center justify-between gap-4">
              <PageDate />
              <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
                {isAdmin && (
                  <Button variant="outline" className="bg-header-button" onClick={() => setTaskOpen(true)}>
                    <ClipboardList className="size-4" /> Novo opravilo
                  </Button>
                )}
                <Button asChild>
                  <Link href="/zahtevki?new=1">
                    <Plus className="size-4" strokeWidth={2.1} /> Nov ticket
                  </Link>
                </Button>
              </div>
            </div>
            <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">
              {greeting(now.getHours())}, {firstName}
            </h1>
          </header>

          <KpiStrip>
            <Kpi
              label={openTitle}
              value={String(stats.open.length)}
              loading={loading}
              href="/zahtevki"
              note={
                machinesDown > 0 ? (
                  <span className="text-priority-high">Stroj stoji: {machinesDown}</span>
                ) : stats.high > 0 ? (
                  <span className="text-priority-high">Visoka prednost: {stats.high}</span>
                ) : (
                  "Brez nujnih"
                )
              }
            />
            <Kpi
              label="V obdelavi"
              value={String(stats.inProgress + stats.coming)}
              loading={loading}
              href="/zahtevki?status=IN_PROGRESS"
              note={`Serviser prihaja: ${stats.coming}`}
            />
            <Kpi
              label="Mediana reševanja"
              value={medianParts?.value ?? "—"}
              unit={medianParts?.unit}
              loading={loading}
              note={stats.sampleSize > 0 ? `Zadnjih ${stats.sampleSize} rešenih` : "Še ni rešenih"}
            />
            {isAdmin ? (
              <Kpi
                label="Zamujena opravila"
                value={String(overdueCount ?? 0)}
                loading={overdueCount === null}
                href="/opravila?view=list&filter=overdue"
                note={(overdueCount ?? 0) > 0 ? <span className="text-priority-high">Po roku</span> : "Vse v roku"}
              />
            ) : (
              <Kpi
                label="Rešeni"
                value={String(stats.resolved.length)}
                loading={loading}
                href="/zahtevki?status=RESOLVED"
                note="Vse vaše rešene prijave"
              />
            )}
          </KpiStrip>

          <DashSection
            title={isAdmin ? "Zahteva pozornost" : openTitle}
            meta={stats.open.length > 0 ? String(stats.open.length) : undefined}
            action={<Link href="/zahtevki" className={LINK}>Vsi ticketi</Link>}
          >
            <AttentionList tickets={stats.attention} loading={loading} error={error} now={now} />
          </DashSection>

          {isAdmin && (
            <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
              <DashSection title="Odprti po tednih">
                {loading ? (
                  <Skeleton className="h-[236px] w-full" />
                ) : backlog.at.length === 0 ? (
                  <p className="text-sm text-nav-foreground">Graf se izriše, ko bo prvi ticket prijavljen.</p>
                ) : (
                  <div className="space-y-3">
                    <BacklogChart points={backlog.points} at={backlog.at} />
                    <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-nav-foreground">
                      <span>
                        Do {shortDay(backlog.at[backlog.at.length - 1]!)}{" "}
                        {new Date(backlog.at[backlog.at.length - 1]!).getFullYear()}
                      </span>
                      <span className="tabular-nums">
                        Zadnji štirje tedni: novi {flowNew} · rešeni {flowResolved}
                      </span>
                    </p>
                  </div>
                )}
              </DashSection>

              <DashSection
                title="Sredstva v servisu"
                meta={stats.machines.length > 0 ? String(stats.machines.length) : undefined}
                action={<Link href="/sredstva" className={LINK}>Vsa sredstva</Link>}
              >
                {loading ? (
                  <RowsSkeleton />
                ) : stats.machines.length === 0 ? (
                  <p className="text-sm text-nav-foreground">Vsa sredstva delujejo - nobeno nima odprtega ticketa.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {stats.machines.slice(0, RECENT_ROWS + 1).map(({ machine, tickets }) => (
                      <AssetRow key={machine.id} machine={machine} tickets={tickets} />
                    ))}
                  </ul>
                )}
              </DashSection>
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
            <DashSection title="Nedavno rešeni">
              {loading ? (
                <RowsSkeleton />
              ) : stats.resolved.length === 0 ? (
                <p className="text-sm text-nav-foreground">Še ni rešenih ticketov.</p>
              ) : (
                <ul>
                  {stats.resolved.slice(0, RECENT_ROWS).map((t) => (
                    <li key={t.id}>
                      <Link href={`/zahtevki/${t.id}`} className={ROW}>
                        <CheckCircle2 className="size-4 shrink-0 text-nav-foreground" />
                        <FadeText className="flex-1">{t.title}</FadeText>
                        <span className={SIDE} title={`Rešen ${formatDate(t.resolvedAt)}`}>
                          {formatDuration(t.createdAt, t.resolvedAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashSection>

            <DashSection title="Nedavno v bazi znanja" action={<Link href="/znanje" className={LINK}>Vse</Link>}>
              {kbLoading && !articles ? (
                <RowsSkeleton />
              ) : recentKb.length === 0 ? (
                <p className="text-sm text-nav-foreground">Baza znanja je prazna.</p>
              ) : (
                <ul>
                  {recentKb.map((a) => (
                    <li key={a.id}>
                      <Link href={`/znanje?id=${a.id}`} className={ROW}>
                        <NotebookPen className="size-4 shrink-0 text-nav-foreground" />
                        <FadeText className="flex-1">{a.title}</FadeText>
                        {a.ticketId && <FromTicketBadge />}
                        <span className={SIDE}>{shortDate(a.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashSection>
          </div>

          {isAdmin && (
            <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
              <DashSection title="Prihodi serviserjev">
                {stats.visits.length === 0 ? (
                  <p className="text-sm text-nav-foreground">Ni dogovorjenih prihodov.</p>
                ) : (
                  <ul>
                    {stats.visits.slice(0, RECENT_ROWS).map((t) => {
                      const late = Date.parse(t.servicerEta!) < now.getTime();
                      const Icon = STATUS_META.SERVICER_COMING.icon;
                      return (
                        <li key={t.id}>
                          <Link href={`/zahtevki/${t.id}`} className={ROW}>
                            <Icon className="size-4 shrink-0 text-nav-foreground" />
                            <FadeText className="flex-1">{t.assignedServicer?.name ?? "Serviser"}</FadeText>
                            <span className={cn(SIDE, late && "text-destructive")}>
                              {late ? "zamuja · " : ""}
                              {formatDateTime(t.servicerEta)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </DashSection>

              <DashSection
                title="Najbolj dejavni"
                action={
                  <div className="flex items-center gap-3">
                    {(["reports", "entries"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={contributorMetric === v}
                        onClick={() => setContributorMetric(v)}
                        className={cn(
                          "text-sm transition-colors",
                          contributorMetric === v ? "font-medium text-foreground" : "text-nav-foreground hover:text-foreground",
                        )}
                      >
                        {v === "reports" ? "Prijave" : "Zapisi"}
                      </button>
                    ))}
                  </div>
                }
              >
                <TopContributors
                  tickets={items}
                  articles={articles ?? null}
                  metric={contributorMetric}
                  loading={loading || (kbLoading && !articles)}
                />
              </DashSection>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <aside className={PAGE_ASIDE}>
          <div className={PAGE_ASIDE_INNER}>
            <WeekTaskList
              anchor={today}
              today={today}
              categoryFilter={ALL_TASKS}
              onOpen={(item) => router.push(`/opravila?view=day&date=${item.occurrence.date}`)}
              onToggle={toggleTask}
            />
          </div>
        </aside>
      )}

      {isAdmin && <NewTaskDialog open={taskOpen} onOpenChange={setTaskOpen} date={today} />}

      <MobileBarActions>
        <BarCircle label="Nov ticket" variant="primary" onClick={() => router.push("/zahtevki?new=1")}>
          <Plus strokeWidth={2.1} />
        </BarCircle>
      </MobileBarActions>
    </div>
  );
}

function DashSection({
  title,
  meta,
  action,
  children,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-4 border-t border-border pt-7">
      <div className="flex h-6 items-center justify-between gap-3">
        <h2 className="flex items-baseline gap-2 text-base font-semibold select-none">
          {title}
          {meta && <span className="text-sm font-normal text-nav-foreground tabular-nums">{meta}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function age(from: string, now: Date): string {
  const min = Math.max(1, Math.round((now.getTime() - Date.parse(from)) / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

function AttentionList({
  tickets,
  loading,
  error,
  now,
}: {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  now: Date;
}) {
  if (loading) return <RowsSkeleton />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (tickets.length === 0) return <p className="text-sm text-nav-foreground">Ni odprtih ticketov - vse prijave so rešene.</p>;
  const shown = tickets.slice(0, OPEN_ROWS);
  const rest = tickets.length - shown.length;
  return (
    <div>
      <ul className="-mx-3 divide-y divide-border">
        {shown.map((t) => {
          const urgent = t.priority === "HIGH" || t.machineDown;
          const Icon = STATUS_META[t.status].icon;
          const asset = t.machine ? `${t.machine.brand} ${t.machine.model}` : null;
          return (
            <li key={t.id}>
              <Link
                href={`/zahtevki/${t.id}`}
                className="flex h-12 items-center gap-3 rounded-md px-3 text-sm transition-colors hover:bg-surface-hover"
              >
                <Icon className={cn("size-4 shrink-0", urgent ? "text-priority-high" : "text-nav-foreground")} />
                <span className="flex min-w-0 flex-1 items-baseline gap-3">
                  <FadeText className="min-w-0 font-medium">{t.title}</FadeText>
                  {asset && <span className="hidden max-w-[35%] shrink-0 truncate text-nav-foreground md:inline">{asset}</span>}
                </span>
                {t.machineDown && (
                  <span className="shrink-0 rounded-full bg-priority-high-badge px-2 py-0.5 text-xs font-medium text-priority-high-foreground">
                    Stroj stoji
                  </span>
                )}
                {t.priority === "HIGH" && !t.machineDown && (
                  <span className="shrink-0 rounded-full bg-priority-high-badge px-2 py-0.5 text-xs font-medium text-priority-high-foreground">
                    Visoka
                  </span>
                )}
                <span className="hidden w-28 shrink-0 truncate text-xs text-nav-foreground lg:inline">
                  {STATUS_META[t.status].label}
                </span>
                <span className="w-12 shrink-0 text-right text-xs text-nav-foreground tabular-nums" title={formatDateTime(t.createdAt)}>
                  {age(t.createdAt, now)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {rest > 0 && (
        <Link href="/zahtevki" className={cn(LINK, "mt-3 inline-block")}>
          Še {rest} na seznamu ticketov
        </Link>
      )}
    </div>
  );
}

function AssetRow({ machine, tickets }: { machine: Machine; tickets: Ticket[] }) {
  const down = tickets.some((t) => t.machineDown);
  return (
    <li>
      <Link
        href={`/zahtevki/${tickets[0]!.id}`}
        className="-mx-3 flex h-12 items-center gap-3 rounded-md px-3 text-sm transition-colors hover:bg-surface-hover"
      >
        <Wrench className={cn("size-4 shrink-0", down ? "text-priority-high" : "text-nav-foreground")} />
        <FadeText className="flex-1 font-medium">
          {machine.brand} {machine.model}
        </FadeText>
        <span className="hidden max-w-[40%] shrink-0 truncate text-xs text-nav-foreground sm:inline">
          {machine.department?.name ?? "Brez oddelka"}
        </span>
        {down && (
          <span className="shrink-0 rounded-full bg-priority-high-badge px-2 py-0.5 text-xs font-medium text-priority-high-foreground">
            Stoji
          </span>
        )}
        <span className="w-6 shrink-0 text-right text-xs text-nav-foreground tabular-nums" title="Odprti ticketi">
          {tickets.length}
        </span>
      </Link>
    </li>
  );
}

function RowsSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-7 w-full" />
      ))}
    </div>
  );
}
