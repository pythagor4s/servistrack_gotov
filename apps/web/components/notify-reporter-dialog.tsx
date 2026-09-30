"use client";

import { useEffect, useState } from "react";
import { Mail } from "@/components/icons";
import { NOTIFY_BODY_MAX, NOTIFY_SUBJECT_MAX } from "@servis-track/shared";
import { formatDateTime } from "@/lib/format";
import type { TicketDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { PropertyInput, PropertyList, PropertyRow } from "@/components/ui/property-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function reporterMessage(ticket: TicketDetail, signature: string) {
  const where = ticket.machine ? ` (${ticket.machine.brand} ${ticket.machine.model})` : "";
  const head = `Pozdravljeni,\n\n`;
  const tail = `\n\nLep pozdrav,\n${signature}`;
  let text: string;
  switch (ticket.status) {
    case "OPEN":
      text = `prejeli smo vašo prijavo napake #${ticket.number} – ${ticket.title}${where}. Pogledali jo bomo čim prej.`;
      break;
    case "IN_PROGRESS":
      text = `vaša prijava #${ticket.number} – ${ticket.title}${where} je v reševanju.`;
      break;
    case "SERVICER_COMING":
      text =
        `za odpravo napake #${ticket.number} – ${ticket.title}${where} smo poklicali serviserja` +
        (ticket.assignedServicer ? ` ${ticket.assignedServicer.name}` : "") +
        "." +
        (ticket.servicerEta ? `\nPredviden prihod: ${formatDateTime(ticket.servicerEta)}.` : "");
      break;
    case "RESOLVED":
      text =
        `napaka #${ticket.number} – ${ticket.title}${where} je odpravljena.` +
        (ticket.resolution ? `\n\nKaj je bilo narejeno:\n${ticket.resolution}` : "");
      break;
  }
  return {
    subject: `[ServisTrack] Vaša prijava #${ticket.number}: ${ticket.title}`.slice(0, NOTIFY_SUBJECT_MAX),
    body: (head + text + tail).slice(0, NOTIFY_BODY_MAX),
  };
}

export function reporterUnreachable(ticket: TicketDetail): string | null {
  const r = ticket.reporter;
  if (!r) return "Prijavitelj nima računa v ServisTracku.";
  if (!r.email) return "Prijavitelj v profilu nima e-pošte.";
  if (!r.active) return "Račun prijavitelja je deaktiviran.";
  if (!r.notifyEmail) return "Prijavitelj je izklopil obvestila po e-pošti.";
  return null;
}

export function NotifyReporterDialog({
  open,
  onOpenChange,
  ticket,
  signature,
  busy,
  onSend,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticket: TicketDetail;
  signature: string;
  busy: boolean;
  onSend: (message: { subject: string; body: string }) => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open) return;
    const m = reporterMessage(ticket, signature);
    setSubject(m.subject);
    setBody(m.body);
  }, [open, ticket, signature]);

  const r = ticket.reporter;
  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-5 shrink-0" />
            Obvesti prijavitelja
          </DialogTitle>
          <DialogDescription className="sr-only">
            Sporočilo lahko uredite, preden ga pošljete prijavitelju.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <PropertyList>
            <PropertyRow label="Za">
              <span className="truncate text-sm">
                {r ? `${r.name ?? r.username} · ${r.email}` : "—"}
              </span>
            </PropertyRow>
            <PropertyRow label="Zadeva">
              <PropertyInput
                aria-label="Zadeva"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={NOTIFY_SUBJECT_MAX}
              />
            </PropertyRow>
          </PropertyList>
          <Separator />
          <div className="space-y-3">
            <Label htmlFor="reporter-body" className="font-normal text-muted-foreground">
              Sporočilo
            </Label>
            <Textarea
              id="reporter-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={NOTIFY_BODY_MAX}
              className="min-h-52"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button disabled={busy || !canSend} onClick={() => onSend({ subject: subject.trim(), body: body.trim() })}>
            Pošlji
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
