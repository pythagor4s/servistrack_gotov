"use client";

import { useState } from "react";
import Link from "next/link";

import { useApi } from "@/lib/useApi";
import { formatDate, formatEur, ticketCountLabel } from "@/lib/format";
import type { MachineDetail, MachineServiceTicket } from "@/lib/types";
import { STATUS_META } from "@/components/badges";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Cog,
  Layers,
  Link2,
  Network,
  Shapes,
  Hash,
} from "@/components/icons";
import { MachinePhoto } from "@/components/machine-photo";
import { AssetFacts, Collapse, EmptyNote, PanelRow, PanelSection, SectionTitle, shortDate } from "@/components/detail-parts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/ui/markdown";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export function MachineHistoryDrawer({
  machineId,
  onClose,
}: {
  machineId: string | null;
  onClose: () => void;
}) {
  const { data: machine, loading, error, refetch } = useApi<MachineDetail>(
    machineId ? `/machines/${machineId}` : null,
  );
  const name = machine ? `${machine.brand} ${machine.model}` : "Stroj";
  const facts = machine ? (
    <AssetFacts department={machine.department?.name} serial={machine.serialNo} />
  ) : null;
  const tickets = machine?.tickets ?? [];
  const open = tickets.filter((t) => t.status !== "RESOLVED");
  const done = tickets.filter((t) => t.status === "RESOLVED");

  return (
    <Drawer direction="right" open={machineId !== null} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="scroll-fade min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-10">
          {machine?.image ? (
            <div>
              <MachinePhoto
                machine={machine}
                className="-mx-6 -mt-6 w-[calc(100%+3rem)] mask-b-from-35% mask-b-to-76%"
              />
              <div className="relative isolate -mt-16">
                <DrawerTitle className="truncate text-xl font-semibold">{name}</DrawerTitle>
                <DrawerDescription asChild>
                  <div className="text-sm text-nav-foreground">
                  {facts}
                  </div>
                </DrawerDescription>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 pr-8">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-inset text-nav-foreground">
                <Cog className="size-6" />
              </span>
              <div className="min-w-0">
                <DrawerTitle className="truncate text-xl font-semibold">{name}</DrawerTitle>
                <DrawerDescription asChild>
                  <div className="text-sm text-nav-foreground">
                  {facts ?? "Zgodovina servisov"}
                  </div>
                </DrawerDescription>
              </div>
            </div>
          )}

          {loading && (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-12 w-full" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Poskusi znova
              </Button>
            </div>
          )}

          {!loading && !error && machine && (
            <>
              <dl className="mt-5 grid grid-cols-4 gap-2 border-t border-border pt-4 pb-4">
                {[
                  ["Prijave", String(tickets.length)],
                  ["Odprte", String(open.length)],
                  ["Rešene", String(done.length)],
                  ["Zadnja", tickets[0] ? shortDate(tickets[0].createdAt) : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="truncate text-xs font-medium text-nav-foreground">{label}</dt>
                    <dd className="truncate text-base font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>

              <PanelSection title="Zadnjih 12 mesecev">
                <dl className="grid grid-cols-4 gap-2">
                  {[
                    ["Okvare", String(machine.stats.faults)],
                    ["Ustavitve", String(machine.stats.stoppages)],
                    ["Zastoj", `${machine.stats.downtimeHours.toLocaleString("sl-SI")} h`],
                    ...(machine.stats.costCents !== null ? [["Strošek", formatEur(machine.stats.costCents)]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="truncate text-xs font-medium text-nav-foreground">{label}</dt>
                      <dd className="truncate text-base font-semibold tabular-nums" title={value}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </PanelSection>

              <PanelSection title="Podrobnosti">
                <dl className="space-y-1">
                  <PanelRow label="Vrsta" icon={Shapes}>
                    {machine.type?.name ?? "—"}
                  </PanelRow>
                  <PanelRow label="Oddelek" icon={Network}>
                    {machine.department?.name ?? "—"}
                  </PanelRow>
                  <PanelRow label="Serijska" icon={Hash}>
                    {machine.serialNo ?? "—"}
                  </PanelRow>
                  {machine.attachedTo && (
                    <PanelRow label="Vezano na" icon={Link2}>
                      {machine.attachedTo.brand} {machine.attachedTo.model}
                    </PanelRow>
                  )}
                  <PanelRow label="Stanje" icon={CircleDot}>
                    {machine.active ? "Aktiven" : "Neaktiven"}
                  </PanelRow>
                </dl>
                {machine.notes && (
                  <p className="mt-3 text-sm whitespace-pre-wrap text-nav-foreground">{machine.notes}</p>
                )}
              </PanelSection>

              <section className="space-y-4 pt-2">
                <SectionTitle
                  action={
                    <span className="text-sm text-nav-foreground">
                      {tickets.length} {ticketCountLabel(tickets.length)}
                    </span>
                  }
                >
                  Zgodovina servisov
                </SectionTitle>
                {tickets.length === 0 ? (
                  <EmptyNote icon={Layers} title="Še ni servisov">
                    Za ta stroj še ni bil prijavljen noben ticket.
                  </EmptyNote>
                ) : (
                  <div className="space-y-3">
                    {open.length > 0 && <Group label="Odprte" tickets={open} />}
                    {done.length > 0 && <Group label="Rešene" tickets={done} />}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Group({ label, tickets }: { label: string; tickets: MachineServiceTicket[] }) {
  return (
    <div>
      <p className="pb-1 text-xs font-medium text-nav-foreground select-none">{label}</p>
      <ul>
        {tickets.map((t) => (
          <HistoryRow key={t.id} ticket={t} />
        ))}
      </ul>
    </div>
  );
}

function HistoryRow({ ticket: t }: { ticket: MachineServiceTicket }) {
  const [open, setOpen] = useState(false);
  const Icon = STATUS_META[t.status].icon;
  const resolved = t.status === "RESOLVED";
  const urgent = !resolved && t.priority === "HIGH";
  const row =
    "group/row -mx-2 flex h-9 w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 text-left text-sm transition-colors hover:bg-surface-hover";
  const content = (
    <>
      <Icon
        className={cn(
          "size-4 shrink-0",
          resolved ? "text-status-progress" : urgent ? "text-priority-high" : "text-nav-foreground",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{t.title}</span>
      {urgent && <AlertTriangle className="size-4 shrink-0 text-priority-high" />}
      <span className="inline-flex h-6 w-16 shrink-0 items-center justify-center gap-1 rounded-md border text-xs text-nav-foreground tabular-nums">
        <CalendarDays className="size-3.5" />
        {shortDate(t.createdAt)}
      </span>
    </>
  );

  if (!resolved) {
    return (
      <li>
        <Link href={`/zahtevki/${t.id}`} className={row}>
          {content}
          <ChevronRight className="size-4 shrink-0 text-nav-foreground transition-transform duration-200 ease-out group-hover/row:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={row}>
        {content}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-nav-foreground transition-transform duration-200 motion-reduce:transition-none",
            !open && "-rotate-90",
          )}
        />
      </button>
      <Collapse open={open}>
        <div className="mt-1 mb-3 ml-2 space-y-2 border-l border-border pl-5">
          {t.resolution ? (
            <Markdown>{t.resolution}</Markdown>
          ) : (
            <p className="text-sm text-nav-foreground">Rešitev ni zabeležena.</p>
          )}
          <Link
            href={`/zahtevki/${t.id}`}
            className="group/open inline-flex items-center gap-1 text-sm text-nav-foreground transition-colors hover:text-foreground"
          >
            Odpri ticket · {formatDate(t.createdAt)}
            <ChevronRight className="size-4 transition-transform duration-200 ease-out group-hover/open:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </div>
      </Collapse>
    </li>
  );
}
