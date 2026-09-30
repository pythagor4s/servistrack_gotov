"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TicketStatus } from "@servis-track/shared";

import { STATUS_META, TYPE_META } from "@/components/badges";
import { ArrowUpRight, CircleDot, Download, Mail, Wrench, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiPatch, apiPost } from "@/lib/api";
import { formatDate, ticketCountLabel } from "@/lib/format";
import type { Servicer, Ticket } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export function useTicketSelection(items: Ticket[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const ids = items.map((t) => t.id).join(",");
  useEffect(() => {
    setSelected(new Set());
  }, [ids]);

  const allChecked = items.length > 0 && items.every((t) => selected.has(t.id));
  const someChecked = !allChecked && items.some((t) => selected.has(t.id));

  return {
    selected,
    count: selected.size,
    has: (id: string) => selected.has(id),
    toggle: (id: string) =>
      setSelected((s) => {
        const next = new Set(s);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    only: (id: string) => setSelected(new Set([id])),
    clear: () => setSelected(new Set()),
    headState: (allChecked ? true : someChecked ? "indeterminate" : false) as boolean | "indeterminate",
    toggleAll: () => setSelected(allChecked ? new Set() : new Set(items.map((t) => t.id))),
    tickets: items.filter((t) => selected.has(t.id)),
  };
}

export type TicketSelection = ReturnType<typeof useTicketSelection>;

export function SelectAllCheckbox({ selection }: { selection: TicketSelection }) {
  return (
    <Checkbox
      checked={selection.headState}
      onCheckedChange={selection.toggleAll}
      aria-label="Izberi vse tickete na strani"
    />
  );
}

export function RowCheckbox({ ticket, selection }: { ticket: Ticket; selection: TicketSelection }) {
  return (
    <Checkbox
      checked={selection.has(ticket.id)}
      onCheckedChange={() => selection.toggle(ticket.id)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      aria-label={`Izberi ticket #${ticket.number}`}
    />
  );
}

const STATUS_ORDER: TicketStatus[] = ["OPEN", "IN_PROGRESS", "SERVICER_COMING", "RESOLVED"];

export function TicketContextMenu({
  enabled,
  targets,
  selection,
  onDone,
  children,
}: {
  enabled: boolean;
  targets: Ticket[];
  selection: TicketSelection;
  onDone: () => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const [confirmResolve, setConfirmResolve] = useState<Ticket[] | null>(null);
  const [forwardFor, setForwardFor] = useState<Ticket[] | null>(null);
  const [busy, setBusy] = useState(false);

  const n = targets.length;
  const open = targets.filter((t) => t.status !== "RESOLVED");
  const allSame = n > 0 && targets.every((t) => t.status === targets[0]!.status) ? targets[0]!.status : null;

  async function runBatch(list: Ticket[], call: (t: Ticket) => Promise<unknown>, done: string) {
    setBusy(true);
    const results = await Promise.allSettled(list.map(call));
    setBusy(false);
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed === 0) toast.success(done);
    else if (failed === list.length) toast.error("Dejanje ni uspelo.");
    else toast.warning(`${list.length - failed} od ${list.length} uspelo, ${failed} ni.`);
    selection.clear();
    onDone();
  }

  function setStatus(status: TicketStatus) {
    const list = targets.filter((t) => t.status !== status);
    if (list.length === 0) return;
    if (status === "RESOLVED") {
      setConfirmResolve(list);
      return;
    }
    void runBatch(
      list,
      (t) => apiPatch(`/tickets/${t.id}`, { status }),
      `Stanje »${STATUS_META[status].label}« za ${list.length} ${ticketCountLabel(list.length)}`,
    );
  }

  if (!enabled) return <>{children}</>;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>
            {n === 1 ? `Ticket #${targets[0]!.number}` : `${n} ${ticketCountLabel(n)}`}
          </ContextMenuLabel>
          {n === 1 && (
            <ContextMenuItem onSelect={() => router.push(`/zahtevki/${targets[0]!.id}`)}>
              <ArrowUpRight /> Odpri
            </ContextMenuItem>
          )}
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={n === 0 || busy}>
              <CircleDot /> Spremeni stanje
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {STATUS_ORDER.map((s) => {
                const Icon = STATUS_META[s].icon;
                return (
                  <ContextMenuItem key={s} disabled={allSame === s} onSelect={() => setStatus(s)}>
                    <Icon /> {STATUS_META[s].label}
                  </ContextMenuItem>
                );
              })}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem disabled={open.length === 0 || busy} onSelect={() => setForwardFor(open)}>
            <Wrench /> Posreduj serviserju…
          </ContextMenuItem>
          <ContextMenuItem disabled={n === 0} onSelect={() => exportCsv(targets)}>
            <Download /> Izvozi CSV
          </ContextMenuItem>
          {selection.count > 0 && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={selection.clear}>
                <X /> Počisti izbor
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <ResolveConfirmDialog
        tickets={confirmResolve}
        busy={busy}
        onCancel={() => setConfirmResolve(null)}
        onConfirm={(list) => {
          setConfirmResolve(null);
          void runBatch(
            list,
            (t) => apiPatch(`/tickets/${t.id}`, { status: "RESOLVED" }),
            `Rešeno: ${list.length} ${ticketCountLabel(list.length)} - opis rešitve dodajte na strani vsakega`,
          );
        }}
      />

      <BulkForwardDialog
        tickets={forwardFor}
        busy={busy}
        onCancel={() => setForwardFor(null)}
        onConfirm={(list, servicerId, channels) => {
          setForwardFor(null);
          void runBatch(
            list,
            (t) => apiPost(`/tickets/${t.id}/forward`, { servicerId, channels }),
            `Posredovano: ${list.length} ${ticketCountLabel(list.length)}, obvestila se pošiljajo`,
          );
        }}
      />
    </>
  );
}

export function targetsFor(t: Ticket, selection: TicketSelection): Ticket[] {
  if (selection.has(t.id)) return selection.tickets;
  selection.only(t.id);
  return [t];
}

function ResolveConfirmDialog({
  tickets,
  busy,
  onCancel,
  onConfirm,
}: {
  tickets: Ticket[] | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (list: Ticket[]) => void;
}) {
  const n = tickets?.length ?? 0;
  return (
    <Dialog open={tickets !== null} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zaključi brez opisa rešitve?</DialogTitle>
          <DialogDescription>
            Stanje »Rešen« za {n} {ticketCountLabel(n)},{" "}
            <span className="font-medium text-foreground">brez opisa rešitve</span> - skupnega opisa za več
            ticketov ni. Opis rešitve lahko pozneje dodate na strani vsakega ticketa posebej (»Zabeleži
            rešitev«). Že rešeni ticketi so izpuščeni.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Prekliči
          </Button>
          <Button disabled={busy} onClick={() => tickets && onConfirm(tickets)}>
            Zaključi brez opisa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CHANNELS = [
  { value: "EMAIL", label: "E-pošta" },
  { value: "SMS", label: "SMS" },
] as const;
type Channel = (typeof CHANNELS)[number]["value"];

function BulkForwardDialog({
  tickets,
  busy,
  onCancel,
  onConfirm,
}: {
  tickets: Ticket[] | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (list: Ticket[], servicerId: string, channels: Channel[]) => void;
}) {
  const open = tickets !== null;
  const { data: servicers } = useApi<Servicer[]>(open ? "/servicers" : null);
  const [servicerId, setServicerId] = useState("");
  const [channels, setChannels] = useState<Channel[]>(["EMAIL"]);
  useEffect(() => {
    if (open) {
      setServicerId("");
      setChannels(["EMAIL"]);
    }
  }, [open]);

  const options = useMemo(
    () =>
      (servicers ?? [])
        .filter((s) => s.active)
        .map((s) => ({ value: s.id, label: s.name, keywords: s.specialty ?? s.email })),
    [servicers],
  );
  const n = tickets?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Posreduj serviserju</DialogTitle>
          <DialogDescription>
            Izbranih: {n} {ticketCountLabel(n)}. Vsak dobi svoje obvestilo, zato serviser prejme toliko
            sporočil, kolikor je ticketov. Rešeni ticketi so izpuščeni.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Combobox
            value={servicerId}
            onChange={setServicerId}
            options={options}
            placeholder="Izberite serviserja"
            icon={Wrench}
            searchable
            searchPlaceholder="Iskanje serviserjev…"
            listClassName="max-h-60"
          />
          <div className="flex items-center gap-5">
            {CHANNELS.map((c) => (
              <Label key={c.value} className="flex items-center gap-2 font-normal">
                <Checkbox
                  checked={channels.includes(c.value)}
                  onCheckedChange={(v) =>
                    setChannels((cur) => (v ? [...cur, c.value] : cur.filter((x) => x !== c.value)))
                  }
                />
                {c.value === "EMAIL" && <Mail className="size-4 text-nav-foreground" />}
                {c.label}
              </Label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Prekliči
          </Button>
          <Button
            disabled={busy || !servicerId || channels.length === 0}
            onClick={() => tickets && onConfirm(tickets, servicerId, channels)}
          >
            Posreduj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function exportCsv(tickets: Ticket[]) {
  const header = ["Številka", "Naslov", "Stanje", "Vrsta", "Oddelek", "Sredstvo", "Prijavitelj", "Serviser", "Ustvarjeno", "Zaključeno"];
  const rows = tickets.map((t) => [
    `#${t.number}`,
    t.title,
    STATUS_META[t.status].label,
    TYPE_META[t.type].label,
    t.department?.name ?? "",
    t.machine ? `${t.machine.brand} ${t.machine.model}` : "",
    t.reporter?.name ?? t.reporter?.username ?? t.reporterName ?? "",
    t.assignedServicer?.name ?? "",
    formatDate(t.createdAt),
    t.resolvedAt ? formatDate(t.resolvedAt) : "",
  ]);
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `ticketi-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Izvoženo: ${tickets.length} ${ticketCountLabel(tickets.length)}`);
}
