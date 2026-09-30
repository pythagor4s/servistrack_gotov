"use client";

import {
  use,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Pencil,
  Mail,
  MessageSquare,
  CheckCircle2,
  RotateCcw,
  Trash2,
  CalendarDays,
  ChevronDown,
  RefreshCw,
  Clock,
  NotebookPen,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Network,
  User,
  Wrench,
  Phone,
  Tags,
  MapPin,
  Hash,
  FileText,
  Link2,
  type IconComponent,
} from "@/components/icons";
import {
  closeTicketSchema,
  updateTicketSchema,
  RESOLUTION_MAX,
  NOTIFY_SUBJECT_MAX,
  NOTIFY_BODY_MAX,
  type CloseTicketInput,
  type NotificationChannel,
} from "@servis-track/shared";
import { apiPatch, apiPost, apiUpload, apiDelete } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { validateForm, type FieldErrors } from "@/lib/form";
import {
  ticketLabel,
  type Attachment,
  type Department,
  type DeliveryAttempt,
  type Machine,
  type Notification,
  type KbHit,
  type KbSearchResponse,
  type KnowledgeArticle,
  type Servicer,
  type Ticket,
  type TicketDetail,
} from "@/lib/types";
import {
  attemptCountLabel,
  formatDate,
  formatDateTime,
  formatDuration,
  formatEur,
  formatTime,
  parseEurToCents,
} from "@/lib/format";
import {
  PRIORITY_INLINE_OPTIONS,
  PRIORITY_META,
  STATUS_META,
  StatusBadge,
  TYPE_META,
  TYPE_OPTIONS,
} from "@/components/badges";
import { BarCircle, MobileBarActions } from "@/components/mobile-action-bar";
import { useMutate } from "@/lib/use-mutate";
import { NONE, ScopeRows } from "@/components/scope-picker";
import { FlashInput } from "@/components/ui/flash-input";
import { PropertyInput, PropertyList, PropertyRow } from "@/components/ui/property-list";
import { PhoneNumber } from "@/components/phone-number";
import { UserAvatar } from "@/components/user-avatar";
import { MachinePhoto } from "@/components/machine-photo";
import { ANIMATED_STATUS_ICON } from "@/components/status-icons";
import { AssetFacts, Collapse, EmptyNote, PanelRow, PanelSection, SubTitle, shortDate } from "@/components/detail-parts";
import { IconGradient } from "@/components/icon-gradient";
import { MachineHistoryDrawer } from "@/components/machine-history-drawer";
import { IconAction } from "@/components/ui/tooltip";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EmptyCell } from "@/components/ui/table";
import { DangerZone } from "@/components/dialog-rows";
import { Switch } from "@/components/ui/switch";
import { Loader } from "@/components/loader";
import { Attachments } from "@/components/attachments";
import { Markdown } from "@/components/ui/markdown";
import { MarkdownEditor } from "@/components/markdown-editor";
import { CategoryField } from "@/components/knowledge/category-field";
import { Highlight } from "@/components/knowledge/highlight";
import { RelevanceMeter } from "@/components/knowledge/relevance-meter";
import { TagInput } from "@/components/ui/tag-input";
import { categoryIcon, useFaultCategories } from "@/lib/fault-categories";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TicketComments } from "@/components/ticket-comments";
import { PAGE_ASIDE, PAGE_ASIDE_INNER, PAGE_MAIN, PAGE_WITH_ASIDE } from "@/lib/page-layout";
import { NotifyReporterDialog, reporterUnreachable } from "@/components/notify-reporter-dialog";

const WORKING_STATUS_OPTIONS: ComboboxOption[] = (
  ["OPEN", "IN_PROGRESS", "SERVICER_COMING"] as const
).map((s) => ({
  value: s,
  label: STATUS_META[s].label,
  icon: STATUS_META[s].icon,
}));
const reporterLabel = (t: TicketDetail): string =>
  t.reporter?.name ?? t.reporter?.username ?? t.reporterName ?? "—";

function NeighbourLink({ id, label, icon: Icon }: { id: string | null; label: string; icon: IconComponent }) {
  return (
    <IconAction label={label}>
      {id ? (
        <Button asChild variant="outline" size="icon" className="bg-header-button">
          <Link href={`/zahtevki/${id}`} aria-label={label}>
            <Icon className="size-4" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon" aria-label={label} className="bg-header-button" disabled>
          <Icon className="size-4" />
        </Button>
      )}
    </IconAction>
  );
}

function MainSection({
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
    <section className="space-y-5 border-t border-border pt-7">
      <div className="flex items-center justify-between gap-3">
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

function TicketProfile({
  ticket,
  onOpenHistory,
  onNotifyReporter,
  servicer,
  attachments,
  related,
}: {
  ticket: TicketDetail;
  onOpenHistory: () => void;
  onNotifyReporter?: () => void;
  servicer: ReactNode;
  attachments: ReactNode;
  related: ReactNode;
}) {
  const reporter = ticket.reporter;
  const finished = ticket.status === "RESOLVED";
  const TypeIcon = TYPE_META[ticket.type].icon;
  const PriorityIcon = PRIORITY_META[ticket.priority].icon;
  const machine = ticket.machine;
  const assetLine = (
    <AssetFacts department={ticket.department?.name} serial={machine?.serialNo} />
  );

  const assetName = machine ? `${machine.brand} ${machine.model}` : TYPE_META[ticket.type].label;

  return (
    <div>
      <div className="space-y-3">
        {machine?.image ? (
          <div className="-mt-4">
            <button
              type="button"
              onClick={onOpenHistory}
              aria-label="Zgodovina servisov stroja"
              className="group/asset block w-full overflow-hidden rounded-lg"
            >
              <MachinePhoto
                machine={machine}
                className="w-full mask-b-from-35% mask-b-to-76%"
              />
            </button>
            <div className="relative isolate -mt-14 px-1">
              <p className="truncate text-lg font-semibold">{assetName}</p>
              <div className="text-sm text-nav-foreground">{assetLine}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-1">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-inset text-nav-foreground">
              <TypeIcon className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{assetName}</p>
              <div className="text-sm text-nav-foreground">{assetLine}</div>
            </div>
          </div>
        )}

        {machine && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="group/row -mx-1 -mt-1.5 flex h-9 w-[calc(100%+0.5rem)] items-center gap-3 rounded-md px-2 text-left text-sm transition-colors hover:bg-surface-hover"
          >
            <Clock className="size-4 shrink-0 text-nav-foreground" />
            <span className="flex-1">Zgodovina servisov</span>
            <ChevronRight className="size-4 shrink-0 text-nav-foreground transition-transform duration-200 ease-out group-hover/row:translate-x-0.5 motion-reduce:transition-none" />
          </button>
        )}
      </div>

      <div className="mt-2 px-1">
        <PanelSection title="Lastnosti">
          <dl className="space-y-1">
            <PanelRow label="Prijavitelj">
              <span className="inline-flex max-w-full items-center gap-2 align-middle">
                {reporter ? (
                  <UserAvatar
                    user={{
                      id: reporter.id,
                      name: reporter.name,
                      username: reporter.username,
                      hasImage: reporter.image != null,
                      imageUpdatedAt: reporter.image?.updatedAt ?? null,
                    }}
                    className="size-5 dark:brightness-[0.88] dark:saturate-[0.85]"
                  />
                ) : (
                  <User className="size-4 shrink-0 text-nav-foreground" />
                )}
                <span className="truncate">{reporterLabel(ticket)}</span>
              </span>
            </PanelRow>
            <PanelRow label="Prijavljen" icon={CalendarDays}>
              {formatDate(ticket.createdAt)} ob {formatTime(ticket.createdAt)}
            </PanelRow>
            <PanelRow label={finished ? "Trajanje" : "Odprt"} icon={Clock}>
              {formatDuration(ticket.createdAt, finished ? ticket.resolvedAt : null)}
            </PanelRow>
            {ticket.resolvedAt && (
              <PanelRow label="Rešeno" icon={CheckCircle2}>
                {formatDateTime(ticket.resolvedAt)}
              </PanelRow>
            )}
            <PanelRow label="Vrsta" icon={TypeIcon}>
              {TYPE_META[ticket.type].label}
            </PanelRow>
            <PanelRow label="Prednost" icon={PriorityIcon}>
              {ticket.priority === "HIGH" ? (
                <span className="font-medium text-priority-high">Visoka</span>
              ) : (
                PRIORITY_META.NORMAL.label
              )}
            </PanelRow>
            <PanelRow label="Oddelek" icon={Network}>
              {ticket.department?.name ?? <EmptyCell />}
            </PanelRow>
            <PanelRow label="Kategorija" icon={categoryIcon(ticket.category)}>
              {ticket.category?.name ?? <EmptyCell />}
            </PanelRow>
            {ticket.serviceCostCents !== null && (
              <PanelRow label="Strošek" icon={Wrench}>
                {formatEur(ticket.serviceCostCents)}
              </PanelRow>
            )}
            {ticket.workOrderNo && (
              <PanelRow label="Nalog" icon={FileText}>
                {ticket.workOrderNo}
              </PanelRow>
            )}
            {ticket.externalId && (
              <PanelRow label={sourceLabel(ticket.externalSource)} icon={Hash}>
                {ticket.externalId}
              </PanelRow>
            )}
            {reporter && !reporter.active && (
              <PanelRow label="Račun" icon={CircleAlert}>
                Prijavitelj je deaktiviran
              </PanelRow>
            )}
          </dl>
          {onNotifyReporter &&
            (reporterUnreachable(ticket) ? (
              <p className="mt-3 text-xs text-nav-foreground">{reporterUnreachable(ticket)}</p>
            ) : (
              <button
                type="button"
                onClick={onNotifyReporter}
                className="group/row -mx-2 mt-2 flex h-9 w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 text-left text-sm transition-colors hover:bg-surface-hover"
              >
                <Mail className="size-4 shrink-0 text-nav-foreground" />
                <span className="flex-1">Obvesti prijavitelja</span>
                <ChevronRight className="size-4 shrink-0 text-nav-foreground transition-transform duration-200 ease-out group-hover/row:translate-x-0.5 motion-reduce:transition-none" />
              </button>
            ))}
          {ticket.externalRefs && <UnmappedRefs ticket={ticket} />}
        </PanelSection>

        <PanelSection title="Serviser">{servicer}</PanelSection>
        <PanelSection title="Priloge">{attachments}</PanelSection>
        {related}

        {ticket.notifications.length > 0 && (
          <PanelSection title="Dostava obvestil" defaultOpen={false}>
            <ul className="space-y-4">
              {ticket.notifications.map((n) => {
                const ChannelIcon = n.channel === "SMS" ? MessageSquare : n.channel === "WEBHOOK" ? Link2 : Mail;
                const StatusIcon =
                  n.status === "DELIVERED" ? CheckCircle2 : n.status === "FAILED" ? CircleAlert : Clock;
                return (
                  <li key={n.id} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-inset text-nav-foreground">
                        <ChannelIcon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{n.recipient}</p>
                        <p className="truncate text-xs text-nav-foreground">
                          {NOTIFICATION_AUDIENCE_LABEL[n.audience]} · {NOTIFICATION_CHANNEL_LABEL[n.channel]} ·{" "}
                          {shortDate(n.createdAt)} ob {formatTime(n.createdAt)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-1.5 text-xs",
                          n.status === "DELIVERED" && "text-status-progress",
                          n.status === "FAILED" && "text-destructive",
                          n.status === "PENDING" && "text-nav-foreground",
                        )}
                      >
                        <StatusIcon className="size-3.5" />
                        {NOTIFICATION_STATUS_LABEL[n.status]}
                      </span>
                    </div>
                    {n.deliveryAttempts && n.deliveryAttempts.length > 0 && (
                      <div className="ml-11 space-y-1">
                        <p className="text-xs text-nav-foreground">
                          {n.attempts} {attemptCountLabel(n.attempts)}
                        </p>
                        <ol className="space-y-0.5">
                          {n.deliveryAttempts.map((d) => (
                            <li key={d.id} className="flex min-w-0 items-center gap-2 text-xs text-nav-foreground">
                              <span
                                className={cn(
                                  "size-1.5 shrink-0 rounded-full",
                                  d.outcome === "SUCCESS" ? "bg-status-progress" : "bg-destructive",
                                )}
                              />
                              <span className="shrink-0 tabular-nums">#{d.attemptNumber}</span>
                              <span className="shrink-0">{ATTEMPT_OUTCOME_LABEL[d.outcome]}</span>
                              {d.durationMs !== null && (
                                <span className="shrink-0 tabular-nums">· {d.durationMs} ms</span>
                              )}
                              {d.error && (
                                <span className="min-w-0 truncate" title={d.error}>
                                  · {d.error}
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </PanelSection>
        )}
      </div>
    </div>
  );
}

function sourceLabel(source: string | null): string {
  if (!source || source === "ditrack") return "DiTrack";
  if (source === "chillyscan") return "ChillyScan";
  return source;
}

function UnmappedRefs({ ticket }: { ticket: TicketDetail }) {
  const refs = ticket.externalRefs ?? {};
  const missing = [
    !ticket.machineId && refs.machineCode && `delovno mesto ${refs.machineCode}`,
    !ticket.machineId && !ticket.departmentId && refs.departmentCode && `oddelek ${refs.departmentCode}`,
    !ticket.categoryId && refs.categoryCode && `kategorija ${refs.categoryCode}`,
    !ticket.reporterId && refs.reporterWorkerNo && `delavec ${refs.reporterWorkerNo}`,
  ].filter(Boolean);
  if (missing.length === 0) return null;
  return (
    <p className="mt-3 flex gap-2 text-xs text-nav-foreground">
      <CircleAlert className="mt-px size-3.5 shrink-0" />
      <span>
        Nepovezane šifre DiTrack: {missing.join(", ")}.{" "}
        <Link href="/sifranti" className="underline underline-offset-2 hover:text-foreground">
          Poveži
        </Link>
      </span>
    </p>
  );
}

const NOTIFICATION_CHANNEL_LABEL: Record<NotificationChannel, string> = {
  EMAIL: "E-pošta",
  SMS: "SMS",
  WEBHOOK: "Webhook",
};

const NOTIFICATION_AUDIENCE_LABEL: Record<Notification["audience"], string> = {
  SERVICER: "Serviser",
  STAFF: "Skrbnik",
  REPORTER: "Prijavitelj",
  SYSTEM: "DiTrack",
};

const NOTIFICATION_STATUS_LABEL: Record<Notification["status"], string> = {
  PENDING: "V čakanju",
  DELIVERED: "Dostavljeno",
  FAILED: "Neuspešno",
};

const ATTEMPT_OUTCOME_LABEL: Record<DeliveryAttempt["outcome"], string> = {
  SUCCESS: "uspeh",
  FAILURE: "neuspeh",
};

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isAdmin, user } = useAuth();
  const { data: ticket, loading, error, refetch } = useApi<TicketDetail>(`/tickets/${id}`);
  const { data: servicers } = useApi<Servicer[]>("/servicers");
  const { data: departments } = useApi<Department[]>("/departments");
  const { data: list } = useApi<Ticket[]>("/tickets?limit=100");
  const scope = ticket
    ? ticket.machineId
      ? { query: `machineId=${ticket.machineId}`, title: "Druge prijave za ta stroj" }
      : ticket.departmentId
        ? {
            query: `departmentId=${ticket.departmentId}`,
            title: `Druge prijave v oddelku ${ticket.department?.name ?? ""}`.trim(),
          }
        : { query: `type=${ticket.type}`, title: `Druge prijave vrste ${TYPE_META[ticket.type].label}` }
    : null;
  const { data: related } = useApi<Ticket[]>(scope ? `/tickets?${scope.query}&limit=7` : null);
  const kbSearchPath = ticket
    ? `/knowledge/search?${new URLSearchParams({
        q: ticket.title,
        excludeTicketId: ticket.id,
        limit: "5",
        ...(ticket.machineId ? { boostMachineId: ticket.machineId } : {}),
      })}`
    : null;
  const { data: kbFound } = useApi<KbSearchResponse>(ticket && !ticket.resolution ? kbSearchPath : null);
  const kbHits = (kbFound?.hits ?? []).filter((h) => h.matchPct >= 25).slice(0, 3);
  const kbQuery = ticket
    ? ticket.machineId
      ? `machineId=${ticket.machineId}`
      : `type=${ticket.type}${ticket.departmentId ? `&departmentId=${ticket.departmentId}` : ""}`
    : null;
  const { data: kb } = useApi<KnowledgeArticle[]>(
    kbQuery && kbFound && kbHits.length === 0 ? `/knowledge?${kbQuery}&limit=4` : null,
  );
  const kbHref = ticket ? `/znanje?q=${encodeURIComponent(ticket.title)}` : "/znanje";
  const neighbours = (() => {
    const index = list?.findIndex((t) => t.id === id) ?? -1;
    if (!list || index < 0) return null;
    return {
      index,
      total: list.length,
      prev: list[index - 1]?.id ?? null,
      next: list[index + 1]?.id ?? null,
    };
  })();

  const { run, busy } = useMutate(refetch);
  const [editOpen, setEditOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Attachment | null>(null);

  useEffect(() => {
    if (ticket) document.title = ticketLabel(ticket);
  }, [ticket]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="size-8 text-muted-foreground" label="Nalaganje ticketa…" />
      </div>
    );
  }
  if (error || !ticket) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{error ?? "Ticketa ni mogoče najti"}</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          Poskusi znova
        </Button>
      </div>
    );
  }

  const isClosed = ticket.status === "RESOLVED";
  const showForward = isAdmin && !isClosed;
  const timeline = buildTimeline(ticket);

  const reporterUser = ticket.reporter;
  const assetName = ticket.machine ? `${ticket.machine.brand} ${ticket.machine.model}` : TYPE_META[ticket.type].label;
  const AssetIcon = TYPE_META[ticket.type].icon;
  return (
    <div className={cn("animate-page-enter relative isolate", PAGE_WITH_ASIDE)}>
      <div className={PAGE_MAIN}>
        <div className="space-y-8">
          <header className="space-y-6">
            <div className="flex min-h-9 items-center justify-between gap-4">
              <nav aria-label="Drobtina" className="flex min-w-0 items-center gap-1.5 text-sm text-nav-foreground">
                <Link href="/zahtevki" className="transition-colors hover:text-foreground">
                  Ticketi
                </Link>
                <ChevronRight aria-hidden className="size-3.5 shrink-0" />
                <span className="shrink-0 font-medium text-foreground tabular-nums">#{ticket.number}</span>
              </nav>
              <div className="hidden shrink-0 items-center gap-4 lg:flex">
                {neighbours && (
                  <div className="flex items-center gap-1.5">
                    <NeighbourLink id={neighbours.prev} label="Prejšnji ticket" icon={ChevronLeft} />
                    <NeighbourLink id={neighbours.next} label="Naslednji ticket" icon={ChevronRight} />
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  {isAdmin && !isClosed ? (
                    <Combobox
                      value={ticket.status}
                      onChange={(s) => run(() => apiPatch(`/tickets/${id}`, { status: s }), "Status posodobljen")}
                      options={WORKING_STATUS_OPTIONS}
                      className="w-44 bg-header-button"
                      disabled={busy}
                    />
                  ) : (
                    <span className="inline-flex h-9 items-center rounded-md border px-3">
                      <StatusBadge status={ticket.status} className="text-foreground" />
                    </span>
                  )}
                  {!isClosed && (
                    <IconAction label="Uredi ticket">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Uredi ticket"
                        className="bg-header-button"
                        disabled={busy}
                        onClick={() => setEditOpen(true)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </IconAction>
                  )}
                  {isAdmin && isClosed && (
                    <Button variant="outline" className="bg-header-button" disabled={busy} onClick={() => setReopenOpen(true)}>
                      <RotateCcw className="size-4" /> Ponovno odpri
                    </Button>
                  )}
                  {isAdmin && !isClosed && (
                    <Button disabled={busy} onClick={() => setCloseOpen(true)}>
                      <CheckCircle2 className="size-4" /> Zaključi
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-balance">{ticket.title}</h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-nav-foreground">
                {ticket.machineDown && !isClosed && (
                  <span className="inline-flex h-6 items-center rounded-full bg-priority-high-badge px-2.5 text-xs font-medium text-priority-high-foreground">
                    Stroj stoji
                  </span>
                )}
                {ticket.priority === "HIGH" && !isClosed && (
                  <span className="inline-flex h-6 items-center rounded-full bg-priority-high-badge px-2.5 text-xs font-medium text-priority-high-foreground">
                    Visoka prednost
                  </span>
                )}
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <AssetIcon className="size-4 shrink-0" />
                  <span className="truncate text-foreground">{assetName}</span>
                </span>
                <span className="inline-flex min-w-0 items-center gap-2">
                  {reporterUser ? (
                    <UserAvatar
                      user={{
                        id: reporterUser.id,
                        name: reporterUser.name,
                        username: reporterUser.username,
                        hasImage: reporterUser.image != null,
                        imageUpdatedAt: reporterUser.image?.updatedAt ?? null,
                      }}
                      className="size-5 dark:brightness-[0.88] dark:saturate-[0.85]"
                    />
                  ) : (
                    <User className="size-4 shrink-0" />
                  )}
                  <span className="truncate">{reporterLabel(ticket)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums" title={formatDateTime(ticket.createdAt)}>
                  <CalendarDays className="size-4 shrink-0" />
                  {formatDate(ticket.createdAt)} ob {formatTime(ticket.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums" title={formatDateTime(ticket.updatedAt)}>
                  <Clock className="size-4 shrink-0" />
                  Posodobljeno {shortDate(ticket.updatedAt)} ob {formatTime(ticket.updatedAt)}
                </span>
              </div>
              {ticket.description && (
                <p className="max-w-prose pt-1 text-[0.9375rem] leading-relaxed whitespace-pre-line text-muted-foreground">
                  {ticket.description}
                </p>
              )}
            </div>
          </header>

          {timeline.length > 0 && (
            <div className="pt-2 pb-2">
              <StatusTimeline entries={timeline} status={ticket.status} />
            </div>
          )}

          <MainSection title="Rešitev">
            <ResolutionPanel
              ticket={ticket}
              isAdmin={isAdmin}
              suggestions={
                kbHits.length > 0
                  ? kbHits.map((h) => ({ article: h.article, hit: h }))
                  : (kb ?? [])
                      .filter((a) => a.ticketId !== ticket.id)
                      .slice(0, 3)
                      .map((article) => ({ article }))
              }
              suggestionsHref={kbHref}
              onRecord={() => setCloseOpen(true)}
            />
          </MainSection>

          <MainSection title="Pogovor" meta={ticket.comments.length > 0 ? String(ticket.comments.length) : undefined}>
            <TicketComments ticket={ticket} onChanged={refetch} />
          </MainSection>
        </div>

        <MobileBarActions>
          {!isClosed && (
            <BarCircle label="Uredi ticket" disabled={busy} onClick={() => setEditOpen(true)}>
              <Pencil />
            </BarCircle>
          )}
          {isAdmin && !isClosed && (
            <BarCircle label="Zaključi" variant="primary" disabled={busy} onClick={() => setCloseOpen(true)}>
              <CheckCircle2 />
            </BarCircle>
          )}
          {isAdmin && isClosed && (
            <BarCircle label="Ponovno odpri" variant="primary" disabled={busy} onClick={() => setReopenOpen(true)}>
              <RotateCcw />
            </BarCircle>
          )}
        </MobileBarActions>
      </div>

      <aside className={PAGE_ASIDE}>
        <div className={PAGE_ASIDE_INNER}>
          <TicketProfile
            ticket={ticket}
            onOpenHistory={() => setHistoryFor(ticket.id)}
            onNotifyReporter={isAdmin ? () => setNotifyOpen(true) : undefined}
            servicer={
              showForward ? (
                <ForwardPanel
                  ticket={ticket}
                  servicers={servicers ?? []}
                  busy={busy}
                  onAssign={(servicerId) =>
                    run(
                      () => apiPatch(`/tickets/${id}`, { assignedServicerId: servicerId }),
                      servicerId ? "Serviser dodeljen" : "Serviser odstranjen",
                    )
                  }
                  onEta={(iso) =>
                    run(
                      () => apiPatch(`/tickets/${id}`, { servicerEta: iso }),
                      iso ? "Termin prihoda zabeležen" : "Termin odstranjen",
                    )
                  }
                  onForward={(servicerId, channels, message) =>
                    run(
                      async () => {
                        const r = await apiPost<{ smsFallback?: boolean }>(`/tickets/${id}/forward`, {
                          servicerId,
                          channels,
                          ...message,
                        });
                        if (r.smsFallback) toast.warning("SMS ni nastavljen - obvestilo gre po e-pošti.");
                      },
                      "Ticket posredovan, obvestilo se pošilja",
                    )
                  }
                />
              ) : ticket.assignedServicer ? (
                <PropertyList className="[&_dt]:text-nav-foreground grid-cols-[5rem_minmax(0,1fr)] gap-x-3">
                  <ServicerRows servicer={ticket.assignedServicer} withName />
                  {ticket.servicerEta && (
                    <PropertyRow label="Prihod">
                      <span className="flex h-8 min-w-0 items-center gap-2 text-sm">
                        <CalendarDays className="size-4 shrink-0 text-nav-foreground" />
                        <span className="truncate">{formatDateTime(ticket.servicerEta)}</span>
                      </span>
                    </PropertyRow>
                  )}
                </PropertyList>
              ) : (
                <p className="text-sm text-nav-foreground">
                  {isClosed ? "Ticket je bil rešen brez zunanjega serviserja." : "Serviserja izbere administrator."}
                </p>
              )
            }
            attachments={
              <Attachments
                heading={() => null}
                ticketId={id}
                attachments={ticket.attachments}
                canManage={isAdmin && !isClosed}
                busy={busy}
                onUpload={(file, onProgress) =>
                  run(() => apiUpload<Attachment>(`/tickets/${id}/attachments`, file, onProgress), "PDF naložen")
                }
                onRemove={setRemoving}
              />
            }
            related={
              scope && (
                <RelatedTickets
                  title={scope.title}
                  href={`/zahtevki?${scope.query}`}
                  tickets={(related ?? []).filter((t) => t.id !== ticket.id).slice(0, 6)}
                  loading={related === null}
                />
              )
            }
          />
        </div>
      </aside>

      <MachineHistoryDrawer
        machineId={historyFor === ticket.id ? (ticket.machine?.id ?? null) : null}
        onClose={() => setHistoryFor(null)}
      />

      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        ticket={ticket}
        departments={departments ?? []}
        busy={busy}
        isAdmin={isAdmin}
        onSave={(patch) =>
          run(() => apiPatch(`/tickets/${id}`, patch), "Ticket posodobljen").then(() =>
            setEditOpen(false),
          )
        }
        onRequestDelete={() => setDeleteOpen(true)}
      />
      <CloseDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        busy={busy}
        defaultResolution={ticket.resolution ?? ""}
        defaultCategoryId={ticket.categoryId}
        withCost={ticket.assignedServicerId !== null || ticket.serviceCostCents !== null}
        defaultCostCents={ticket.serviceCostCents}
        ticketTitle={ticket.title}
        recording={isClosed}
        onClose={(input) =>
          run(() => apiPost(`/tickets/${id}/close`, input), isClosed ? "Rešitev zabeležena" : "Ticket rešen").then(() =>
            setCloseOpen(false),
          )
        }
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={ticket.title}
        busy={busy}
        onDelete={() =>
          run(() => apiDelete(`/tickets/${id}`), "Ticket izbrisan").then(() => {
            setDeleteOpen(false);
            setEditOpen(false);
            window.location.href = "/zahtevki";
          })
        }
      />
      <RemoveAttachmentDialog
        open={removing !== null}
        onOpenChange={(v) => !v && setRemoving(null)}
        attachment={removing}
        busy={busy}
        onConfirm={() => {
          const target = removing;
          if (!target) return;
          void run(
            () => apiDelete(`/tickets/${id}/attachments/${target.id}`),
            "Priloga odstranjena",
          ).then(() => setRemoving(null));
        }}
      />
      <NotifyReporterDialog
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        ticket={ticket}
        signature={user?.name ?? user?.username ?? "ServisTrack"}
        busy={busy}
        onSend={(message) =>
          run(
            () => apiPost(`/tickets/${id}/notify-reporter`, message),
            "Obvestilo prijavitelju se pošilja",
          ).then(() => setNotifyOpen(false))
        }
      />
      <ReopenDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        busy={busy}
        onReopen={() =>
          run(
            () => apiPatch(`/tickets/${id}`, { status: "IN_PROGRESS" }),
            "Ticket ponovno odprt",
          ).then(() => setReopenOpen(false))
        }
      />
    </div>
  );
}

function EditDialog({
  open,
  onOpenChange,
  ticket,
  departments,
  busy,
  isAdmin,
  onSave,
  onRequestDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticket: TicketDetail;
  departments: Department[];
  busy: boolean;
  isAdmin: boolean;
  onSave: (patch: Record<string, unknown>) => void;
  onRequestDelete: () => void;
}) {
  const { data: machines } = useApi<Machine[]>("/machines");
  const [title, setTitle] = useState(ticket.title);
  const [type, setType] = useState<string>(ticket.type);
  const [highPriority, setHighPriority] = useState(ticket.priority === "HIGH");
  const [departmentId, setDepartmentId] = useState(ticket.departmentId ?? NONE);
  const [machineId, setMachineId] = useState(ticket.machineId ?? NONE);
  const [categoryId, setCategoryId] = useState(ticket.categoryId ?? NONE);
  const [machineDown, setMachineDown] = useState(ticket.machineDown);
  const { data: categories } = useFaultCategories();
  const [errors, setErrors] = useState<FieldErrors>({});

  const isMachine = type === "MACHINE";

  function submit() {
    const patch = {
      title: title.trim(),
      type,
      priority: highPriority ? "HIGH" : "NORMAL",
      machineId: isMachine && machineId !== NONE ? machineId : null,
      ...(isMachine ? {} : { departmentId: departmentId === NONE ? null : departmentId }),
      categoryId: categoryId === NONE ? null : categoryId,
      machineDown,
    };
    const parsed = validateForm(updateTicketSchema, patch);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    onSave(patch);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[28rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 shrink-0" />
            Uredi ticket
          </DialogTitle>
          <DialogDescription className="sr-only">Posodobitev podatkov o prijavi napake.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <FlashInput
              aria-label="Naslov"
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
            <PropertyRow label="Kategorija">
              <CategoryField
                value={categoryId}
                onChange={setCategoryId}
                categories={categories ?? []}
                suggestFrom={title}
              />
            </PropertyRow>
            <PropertyRow label="Stroj stoji">
              <div className="flex h-8 items-center">
                <Switch checked={machineDown} onCheckedChange={setMachineDown} aria-label="Stroj stoji" />
              </div>
            </PropertyRow>
          </PropertyList>
          {isAdmin && (
            <DangerZone
              label="Izbriši ta ticket"
              description="Izbriše prijavo skupaj s prilogami in zgodovino obveščanja. Tega ni mogoče razveljaviti."
              actionLabel="Izbriši"
              disabled={busy}
              onAction={onRequestDelete}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button disabled={busy} onClick={submit}>
            Shrani spremembe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function forwardMessage(ticket: TicketDetail, channel: "EMAIL" | "SMS") {
  const machine = ticket.machine ? `${ticket.machine.brand} ${ticket.machine.model}` : null;
  const priority = PRIORITY_META[ticket.priority].label;

  if (channel === "SMS") {
    return {
      subject: "",
      body:
        `ServisTrack: prijava napake\n` +
        `${ticket.title}${machine ? ` (${machine})` : ""}\n` +
        `Prioriteta: ${priority}\n` +
        `Prosimo za povratni klic glede termina.`,
    };
  }

  return {
    subject: `[ServisTrack] ${ticket.title}`,
    body:
      `Pozdravljeni,\n\n` +
      `obveščamo vas o napaki, ki je bila prijavljena v našem sistemu za servisne zahtevke.\n\n` +
      `Napaka: ${ticket.title}\n` +
      (machine ? `Stroj: ${machine}\n` : "") +
      `Prioriteta: ${priority}\n` +
      `Prijavljeno: ${formatDateTime(ticket.createdAt)}\n\n` +
      `Prosimo, da nam sporočite, kdaj lahko pride serviser, oziroma se glede termina ` +
      `oglasite na ta e-poštni naslov.\n\n` +
      `Lep pozdrav,\n` +
      `ServisTrack`,
  };
}

type TimelineEntry = {
  id: string;
  at: string;
  label: string;
  icon: IconComponent;
  who: string | null;
  status?: TicketDetail["status"];
};

function buildTimeline(ticket: TicketDetail): TimelineEntry[] {
  const statuses: TimelineEntry[] = ticket.events.map((e) => ({
    id: e.id,
    at: e.createdAt,
    label: STATUS_META[e.to].label,
    icon: STATUS_META[e.to].icon,
    who: e.actor?.name ?? e.actor?.username ?? null,
    status: e.to,
  }));

  const sends: TimelineEntry[] = ticket.notifications.flatMap((n) => {
    if (n.audience !== "SERVICER") return [];
    const ok = n.deliveryAttempts?.find((d) => d.outcome === "SUCCESS");
    if (!ok) return [];
    return [
      {
        id: ok.id,
        at: ok.createdAt,
        label: n.channel === "SMS" ? "SMS poslan" : "E-pošta poslana",
        icon: n.channel === "SMS" ? MessageSquare : Mail,
        who: null,
      },
    ];
  });

  return [...statuses, ...sends].sort((a, b) => a.at.localeCompare(b.at));
}

const STATUS_ORDER: TicketDetail["status"][] = ["OPEN", "IN_PROGRESS", "SERVICER_COMING", "RESOLVED"];

const DrivingTruck = ({ className }: { className?: string }) => {
  const Truck = ANIMATED_STATUS_ICON.SERVICER_COMING;
  return <Truck className={className} animate />;
};

function compactDuration(from: string, to?: string): string {
  const ms = (to ? Date.parse(to) : Date.now()) - Date.parse(from);
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

function StatusTimeline({
  entries,
  status,
}: {
  entries: TimelineEntry[];
  status: TicketDetail["status"];
}) {
  const pending = STATUS_ORDER.slice(STATUS_ORDER.indexOf(status) + 1);
  const lastComingIndex = entries.map((e) => e.status).lastIndexOf("SERVICER_COMING");
  const currentIndex = entries.length - 1;
  const steps = [
    ...entries.map((e, i) => ({ ...e, state: i === currentIndex ? "current" : "done" }) as const),
    ...pending.map(
      (st) =>
        ({
          id: `pending-${st}`,
          at: "",
          label: STATUS_META[st].label,
          icon: STATUS_META[st].icon,
          who: null,
          state: "pending",
        }) as const,
    ),
  ];
  return (
    <>
      <IconGradient />
      <ol aria-label="Zgodovina" className="-mx-4 -mt-4 flex overflow-x-auto px-4 pt-4 pb-1 [scrollbar-width:none]! [&::-webkit-scrollbar]:hidden">
        {steps.map((e, i) => {
          const driving = status === "SERVICER_COMING" && i === lastComingIndex && i === currentIndex;
          const Icon = driving ? DrivingTruck : e.icon;
          const last = i === steps.length - 1;
          const next = steps[i + 1];
          const current = e.state === "current";
          return (
            <li key={e.id} className={cn("flex min-w-24 flex-col", last ? "flex-none" : "flex-1")}>
              <div className="flex h-12 items-center">
                <span
                  className={cn(
                    "relative flex shrink-0 items-center justify-center rounded-full border",
                    current ? "size-12" : "size-10",
                    current &&
                      "border-primary/40 bg-header-button bg-linear-to-b from-primary/12 to-transparent text-foreground shadow-md shadow-primary/10",
                    e.state === "done" && "bg-step-done text-nav-foreground",
                    e.state === "pending" && "border-dashed text-foreground-faint",
                  )}
                >
                  {current && (
                    <span aria-hidden className="step-pulse pointer-events-none absolute inset-0 rounded-full text-primary" />
                  )}
                  <Icon
                    className={cn(
                      "relative",
                      current ? "size-6 [&_*]:[stroke:url(#icon-gradient)]" : "size-5",
                      e.icon === STATUS_META.IN_PROGRESS.icon && "-translate-y-0.5",
                    )}
                  />
                </span>
                {!last && (
                  <span className="relative mx-3 flex h-px flex-1 items-center">
                    {next?.state === "pending" ? (
                      <span className="w-full border-t border-dashed border-border" />
                    ) : (
                      <>
                        <span
                          aria-hidden
                          className={cn(
                            "h-0.5 w-full rounded-full",
                            next?.state === "current"
                              ? "bg-linear-to-r from-nav-foreground/35 to-primary/70"
                              : "bg-nav-foreground/35",
                          )}
                        />
                        {next && (
                          <span
                            className="absolute inset-x-0 bottom-2 text-center text-[0.6875rem] whitespace-nowrap text-nav-foreground tabular-nums"
                          >
                            {compactDuration(e.at, next.at)}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="mt-2 min-w-0 space-y-0.5 pr-4 text-xs">
                <p
                  className={cn(
                    "text-sm leading-snug",
                    current && "font-semibold",
                    e.state === "pending" && "text-foreground-faint",
                  )}
                >
                  {e.label}
                </p>
                {e.state === "pending" ? (
                  <p className="text-foreground-faint">Še ni</p>
                ) : (
                  <>
                    <p className="text-nav-foreground tabular-nums" title={formatDateTime(e.at)}>
                      {shortDate(e.at)} {formatTime(e.at)}
                    </p>
                    {current && status !== "RESOLVED" && (
                      <p className="font-medium text-primary tabular-nums">že {compactDuration(e.at)}</p>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function KbSuggestion({ article, hit }: { article: KnowledgeArticle; hit?: KbHit }) {
  const [open, setOpen] = useState(false);
  const Icon = article.category ? categoryIcon(article.category) : NotebookPen;
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="-mx-2 flex h-9 w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 text-left text-sm transition-colors hover:bg-surface-hover"
      >
        <Icon className="size-4 shrink-0 text-nav-foreground" />
        <span className="min-w-0 flex-1 truncate">
          {hit ? <Highlight text={article.title} ranges={hit.title} /> : article.title}
        </span>
        {hit && <RelevanceMeter value={Math.round((hit.relevance + hit.matchPct) / 2)} className="shrink-0" />}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-nav-foreground transition-transform duration-200 motion-reduce:transition-none",
            !open && "-rotate-90",
          )}
        />
      </button>
      <Collapse open={open}>
        <div className="mt-1 mb-2 ml-2 border-l border-border pl-5 opacity-70">
          <Markdown>{article.body}</Markdown>
        </div>
      </Collapse>
    </li>
  );
}

function RelatedTickets({
  title,
  href,
  tickets,
  loading,
}: {
  title: string;
  href: string;
  tickets: Ticket[];
  loading: boolean;
}) {
  const byDate = [...tickets].sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const open = byDate.filter((t) => t.status !== "RESOLVED");
  const done = byDate.filter((t) => t.status === "RESOLVED");
  const group = (label: string, rows: Ticket[]) =>
    rows.length > 0 && (
      <div key={label}>
        <p className="pb-1 text-xs font-medium text-nav-foreground select-none">{label}</p>
        <ul className="-mx-2">
          {rows.map((t) => {
            const urgent = t.status !== "RESOLVED" && t.priority === "HIGH";
            const Icon = STATUS_META[t.status].icon;
            return (
              <li key={t.id}>
                <Link
                  href={`/zahtevki/${t.id}`}
                  title={t.title}
                  className="flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition-colors hover:bg-surface-hover"
                >
                  <Icon className={cn("size-4 shrink-0 text-nav-foreground", urgent && "text-priority-high")} />
                  <span className={cn("min-w-0 flex-1 truncate", t.status === "RESOLVED" && "text-muted-foreground")}>
                    {t.title}
                  </span>
                  <span className="shrink-0 text-xs text-nav-foreground tabular-nums">{shortDate(t.createdAt)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <PanelSection title={title}>
      {loading ? null : tickets.length === 0 ? (
        <p className="text-sm text-nav-foreground">Drugih prijav ni - ta okvara je tu prva.</p>
      ) : (
        <div className="space-y-3">
          {group("Odprte", open)}
          {group("Rešene", done)}
          <Link href={href} className="inline-flex items-center gap-1 text-sm text-nav-foreground transition-colors hover:text-foreground">
            Vse prijave <ChevronRight className="size-3.5" />
          </Link>
        </div>
      )}
    </PanelSection>
  );
}

function ResolutionPanel({
  ticket,
  isAdmin,
  suggestions,
  suggestionsHref,
  onRecord,
}: {
  ticket: TicketDetail;
  isAdmin: boolean;
  onRecord: () => void;
  suggestions: { article: KnowledgeArticle; hit?: KbHit }[];
  suggestionsHref: string;
}) {
  if (ticket.resolution) return <Markdown>{ticket.resolution}</Markdown>;
  if (ticket.status === "RESOLVED")
    return (
      <div className="space-y-3">
        <EmptyNote title="Rešitev ni zabeležena" />
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={onRecord}>
            <NotebookPen className="size-4" /> Zabeleži rešitev
          </Button>
        )}
      </div>
    );
  return (
    <div className="space-y-4">
      <EmptyNote title="Rešitve še ni">
        {isAdmin
          ? "Zaključite ticket in zabeležite, kaj ga je odpravilo."
          : "Rešitev zabeleži administrator ob zaključku ticketa."}
      </EmptyNote>
      {suggestions.length > 0 && (
        <div>
          <SubTitle
            action={
              <Link href={suggestionsHref} className="text-sm text-nav-foreground transition-colors hover:text-foreground">
                Vse
              </Link>
            }
          >
            Morda pomaga iz baze znanja
          </SubTitle>
          <ul>
            {suggestions.map(({ article, hit }) => (
              <KbSuggestion key={article.id} article={article} hit={hit} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Specialty({ text }: { text: string }) {
  const m = /^(.*?)\s*(\([^()]*\))$/.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]} <span className="text-nav-foreground">{m[2]}</span>
    </>
  );
}

const ETA_TIME_OPTIONS: ComboboxOption[] = Array.from({ length: 29 }, (_, i) => {
  const m = 6 * 60 + i * 30;
  const label = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  return { value: String(m), label };
});

function splitLocal(iso: string | null): { date: string | null; minute: number } {
  if (!iso) return { date: null, minute: 9 * 60 };
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { date, minute: d.getHours() * 60 + d.getMinutes() };
}

function EtaRow({
  value,
  busy,
  onChange,
}: {
  value: string | null;
  busy: boolean;
  onChange: (iso: string | null) => void;
}) {
  const { date, minute } = splitLocal(value);
  const save = (d: string | null, m: number) => {
    if (!d) return onChange(null);
    const [y, mo, day] = d.split("-").map(Number);
    onChange(new Date(y!, mo! - 1, day!, Math.floor(m / 60), m % 60).toISOString());
  };
  const timeOptions = ETA_TIME_OPTIONS.some((o) => o.value === String(minute))
    ? ETA_TIME_OPTIONS
    : [...ETA_TIME_OPTIONS, { value: String(minute), label: `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}` }];
  return (
    <PropertyRow label="Prihod">
      <div className="flex min-w-0 flex-wrap items-center gap-x-1">
        <DatePicker
          variant="inline"
          value={date}
          onChange={(d) => save(d, minute)}
          clearable
          clearLabel="Brez termina"
          placeholder="Termin prihoda…"
        />
        {date && (
          <Combobox
            variant="inline"
            value={String(minute)}
            onChange={(v) => save(date, Number(v))}
            options={timeOptions}
            listClassName="max-h-64"
            className="ml-0 tabular-nums"
            disabled={busy}
          />
        )}
      </div>
    </PropertyRow>
  );
}

function ServicerRows({ servicer, withName = false }: { servicer: Servicer; withName?: boolean }) {
  const text = "flex h-8 min-w-0 items-center gap-2 text-sm";
  const icon = "size-4 shrink-0 text-nav-foreground";
  return (
    <>
      {withName && (
        <PropertyRow label="Serviser">
          <span className={cn(text, "font-medium")}>
            <Wrench className={icon} />
            <span className="truncate">{servicer.name}</span>
          </span>
        </PropertyRow>
      )}
      <PropertyRow label="E-pošta">
        <span className={text}>
          <Mail className={icon} />
          <span className="min-w-0 flex-1 truncate">{servicer.email}</span>
        </span>
      </PropertyRow>
      <PropertyRow label="Telefon">
        <span className={text}>
          <Phone className={icon} />
          <span className="min-w-0 flex-1 truncate">
            <PhoneNumber phone={servicer.phone} icon={false} tone="inherit" />
          </span>
        </span>
      </PropertyRow>
      <PropertyRow label="Področje">
        <span className={text}>
          <Tags className={icon} />
          <span className="truncate">{servicer.specialty ? <Specialty text={servicer.specialty} /> : <EmptyCell />}</span>
        </span>
      </PropertyRow>
      <PropertyRow label="Naslov">
        <span className={text}>
          <MapPin className={icon} />
          <span className="truncate">{servicer.address ?? <EmptyCell />}</span>
        </span>
      </PropertyRow>
    </>
  );
}

const NO_SERVICER = "NONE";

const MutedWrench = ({ className }: { className?: string }) => (
  <Wrench className={cn(className, "text-nav-foreground")} />
);

function ForwardPanel({
  ticket,
  servicers,
  busy,
  onAssign,
  onForward,
  onEta,
}: {
  ticket: TicketDetail;
  servicers: Servicer[];
  busy: boolean;
  onAssign: (
    servicerId: string | null,
  ) => void;
  onForward: (
    servicerId: string,
    channels: ("EMAIL" | "SMS")[],
    message: { subject?: string; body: string },
  ) => Promise<void> | void;
  onEta: (iso: string | null) => void;
}) {
  const [compose, setCompose] = useState<"EMAIL" | "SMS" | null>(null);
  const servicerId = ticket.assignedServicerId ?? NO_SERVICER;
  const active = servicers.filter((s) => s.active);
  const options = active.some((s) => s.id === ticket.assignedServicerId)
    ? active
    : [...active, ...servicers.filter((s) => s.id === ticket.assignedServicerId)];
  const servicer = servicers.find((s) => s.id === ticket.assignedServicerId) ?? null;
  const smsRecipient = servicer ? (servicer.phone ?? servicer.email) : "";

  const last = servicer
    ? ticket.notifications.find(
        (n) =>
          n.audience === "SERVICER" &&
          (n.recipient === servicer.email || (servicer.phone && n.recipient === servicer.phone)),
      )
    : undefined;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PropertyList className="[&_dt]:text-nav-foreground grid-cols-[5rem_minmax(0,1fr)] gap-x-3">
        <PropertyRow label="Serviser">
          <Combobox
            variant="inline"
            icon={MutedWrench}
            emptyValue={NO_SERVICER}
            value={servicerId}
            onChange={(v) => onAssign(v === NO_SERVICER ? null : v)}
            options={[
              { value: NO_SERVICER, label: "Brez serviserja" },
              ...options.map((s) => ({
                value: s.id,
                label: s.name,
                keywords: s.specialty ?? s.email,
              })),
            ]}
            searchable
            searchPlaceholder="Iskanje serviserjev…"
            listClassName="max-h-60"
            disabled={busy}
          />
        </PropertyRow>
        {servicer && <ServicerRows servicer={servicer} />}
        {servicer && <EtaRow value={ticket.servicerEta} busy={busy} onChange={onEta} />}
      </PropertyList>

      {!servicer && (
        <EmptyNote icon={Wrench} title="Serviser še ni izbran">
          Izberite ga zgoraj in mu pošljite obvestilo po e-pošti ali SMS.
        </EmptyNote>
      )}

      {servicer && (
        <div className="mt-2 flex items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            {last ? (
              <>
                <p className="flex min-w-0 items-center gap-3 font-medium">
                  <span className="truncate">{NOTIFICATION_CHANNEL_LABEL[last.channel]}</span>
                  <span className="shrink-0 text-nav-foreground">
                    {NOTIFICATION_STATUS_LABEL[last.status].toLowerCase()}
                  </span>
                </p>
                <p className="truncate text-nav-foreground">
                  Zadnje obvestilo {shortDate(last.createdAt)} ob {formatTime(last.createdAt)}
                </p>
              </>
            ) : (
              <>
                <p className="truncate font-medium">Še ni obveščen</p>
                <p className="truncate text-xs text-nav-foreground">Pošljite mu e-pošto ali SMS s podatki o okvari.</p>
              </>
            )}
          </div>
          <Button
            size="sm"
            variant={last ? "outline" : "default"}
            className={cn("shrink-0", last && "bg-transparent")}
            disabled={busy}
            onClick={() => setCompose("EMAIL")}
          >
            {last ? (
              <>
                <RefreshCw className="size-3.5" /> Obvesti znova
              </>
            ) : (
              "Obvesti"
            )}
          </Button>
        </div>
      )}

      {servicer && compose && (
        <ComposeDialog
          ticket={ticket}
          servicer={servicer}
          smsRecipient={smsRecipient}
          busy={busy}
          onCancel={() => setCompose(null)}
          onSend={async (channel, message) => {
            await onForward(servicer.id, [channel], message);
            setCompose(null);
          }}
        />
      )}
    </div>
  );
}

const CHANNEL_OPTIONS: ComboboxOption[] = [
  { value: "EMAIL", label: "E-pošta", icon: Mail },
  { value: "SMS", label: "SMS", icon: MessageSquare },
];

function ComposeDialog({
  ticket,
  servicer,
  smsRecipient,
  busy,
  onCancel,
  onSend,
}: {
  ticket: TicketDetail;
  servicer: Servicer;
  smsRecipient: string;
  busy: boolean;
  onCancel: () => void;
  onSend: (channel: "EMAIL" | "SMS", message: { subject?: string; body: string }) => void | Promise<void>;
}) {
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const initial = forwardMessage(ticket, "EMAIL");
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const isEmail = channel === "EMAIL";
  const recipient = isEmail ? servicer.email : smsRecipient;
  function switchChannel(next: string) {
    const c = next === "SMS" ? "SMS" : "EMAIL";
    const m = forwardMessage(ticket, c);
    setChannel(c);
    setSubject(m.subject);
    setBody(m.body);
  }
  const canSend = body.trim().length > 0 && (!isEmail || subject.trim().length > 0);

  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEmail ? <Mail className="size-5 shrink-0" /> : <MessageSquare className="size-5 shrink-0" />}
            Obvesti serviserja
          </DialogTitle>
          <DialogDescription className="sr-only">
            Sporočilo lahko uredite, preden ga pošljete serviserju {servicer.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <PropertyList>
            <PropertyRow label="Kanal">
              <Combobox variant="inline" value={channel} onChange={switchChannel} options={CHANNEL_OPTIONS} />
            </PropertyRow>
            <PropertyRow label="Za">
              <span className="truncate text-sm">
                {servicer.name} · {recipient}
              </span>
            </PropertyRow>
            {isEmail && (
              <PropertyRow label="Zadeva">
                <PropertyInput
                  aria-label="Zadeva"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={NOTIFY_SUBJECT_MAX}
                />
              </PropertyRow>
            )}
          </PropertyList>
          {!isEmail && (
            <p className="text-xs text-nav-foreground">
              SMS ponudnik še ni izbran, zato gre sporočilo serviserju po e-pošti.
            </p>
          )}
          <Separator />
          <div className="space-y-3">
            <Label htmlFor="notify-body" className="font-normal text-muted-foreground">
              Sporočilo
            </Label>
            <Textarea
              id="notify-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={NOTIFY_BODY_MAX}
              className="min-h-52"
            />
            <p className="text-xs text-muted-foreground">
              Sporočilo se pošlje kot navadno besedilo, oblikovanje se ne prenese, prazne
              vrstice pa ostanejo.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Prekliči
          </Button>
          <Button
            disabled={busy || !canSend}
            onClick={() =>
              void onSend(channel, { ...(isEmail ? { subject: subject.trim() } : {}), body: body.trim() })
            }
          >
            {isEmail ? <Mail className="size-4" /> : <MessageSquare className="size-4" />}
            Pošlji
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({
  open,
  onOpenChange,
  busy,
  defaultResolution,
  defaultCategoryId,
  withCost,
  defaultCostCents,
  ticketTitle,
  onClose,
  recording = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy: boolean;
  defaultResolution: string;
  defaultCategoryId: string | null;
  withCost: boolean;
  defaultCostCents: number | null;
  ticketTitle: string;
  recording?: boolean;
  onClose: (input: CloseTicketInput) => void;
}) {
  const [resolution, setResolution] = useState(defaultResolution);
  const [addToKb, setAddToKb] = useState(true);
  const [categoryId, setCategoryId] = useState(NONE);
  const [tags, setTags] = useState<string[]>([]);
  const [cost, setCost] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const { data: categories } = useFaultCategories();

  useEffect(() => {
    if (open) {
      setResolution(defaultResolution);
      setAddToKb(true);
      setCategoryId(defaultCategoryId ?? NONE);
      setCost(defaultCostCents != null ? (defaultCostCents / 100).toFixed(2).replace(".", ",") : "");
      setTags([]);
      setErr(null);
    }
  }, [open, defaultResolution, defaultCategoryId, defaultCostCents]);

  function submit() {
    const costCents = withCost ? parseEurToCents(cost) : undefined;
    if (costCents === undefined && withCost) {
      setErr("Strošek vpišite kot znesek, npr. 245,00.");
      return;
    }
    const values = {
      resolution: resolution.trim(),
      addToKnowledgeBase: addToKb,
      ...(categoryId !== NONE ? { categoryId } : {}),
      ...(withCost ? { serviceCostCents: costCents } : {}),
      ...(addToKb && tags.length > 0 ? { tags } : {}),
    };
    const parsed = validateForm(closeTicketSchema, values);
    if (!parsed.ok) {
      setErr(parsed.errors.resolution ?? parsed.errors.tags ?? "Neveljaven vnos");
      return;
    }
    setErr(null);
    onClose(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 shrink-0" />
            {recording ? "Zabeleži rešitev" : "Zaključi ticket"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Opišite, kaj je bilo narejeno. To postane rešitev in lahko dopolni bazo znanja.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <MarkdownEditor
            value={resolution}
            onChange={setResolution}
            placeholder="Kaj je odpravilo napako?"
            maxLength={RESOLUTION_MAX}
            invalid={!!err}
          />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <PropertyList>
            <PropertyRow label="Kategorija">
              <CategoryField
                value={categoryId}
                onChange={setCategoryId}
                categories={categories ?? []}
                suggestFrom={`${ticketTitle}\n${resolution}`}
              />
            </PropertyRow>
            {withCost && (
              <PropertyRow label="Strošek">
                <PropertyInput
                  aria-label="Strošek servisa v evrih"
                  inputMode="decimal"
                  placeholder="Znesek z računa, npr. 245,00 €"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </PropertyRow>
            )}
          </PropertyList>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={addToKb}
              onChange={(e) => setAddToKb(e.target.checked)}
              className="size-4 rounded border-border accent-primary"
            />
            Objavi tudi v bazi znanja
          </label>
          <Collapse open={addToKb}>
            <PropertyList className="pt-1">
              <PropertyRow label="Oznake">
                <TagInput value={tags} onChange={setTags} placeholder="Npr. koda napake, del…" />
              </PropertyRow>
            </PropertyList>
          </Collapse>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button disabled={busy} onClick={submit}>
            Reši ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  title,
  busy,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  busy: boolean;
  onDelete: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 shrink-0" />
            Brisanje ticketa
          </DialogTitle>
          <DialogDescription>
            To trajno izbriše{" "}
            <span className="font-semibold text-primary">{title}</span> skupaj s prilogami in
            zgodovino obveščanja. Tega ni mogoče razveljaviti.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onDelete}>
            Izbriši ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveAttachmentDialog({
  open,
  onOpenChange,
  attachment,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  attachment: Attachment | null;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 shrink-0" />
            Odstranitev priloge
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-primary">{attachment?.filename}</span> bo
            dokončno izbrisana s tega ticketa. Če gre za serviserjev delovni nalog, druge kopije
            v sistemu ni.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            Odstrani
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReopenDialog({
  open,
  onOpenChange,
  busy,
  onReopen,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy: boolean;
  onReopen: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-5 shrink-0" />
            Ponovno odprtje ticketa
          </DialogTitle>
          <DialogDescription>
            Ticket se vrne v stanje „V teku“, da se delo lahko nadaljuje. Obstoječa rešitev
            se ohrani in jo je mogoče urediti.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button disabled={busy} onClick={onReopen}>
            Ponovno odpri ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
