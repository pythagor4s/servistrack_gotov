"use client";

import { useState } from "react";
import { COMMENT_MAX, createCommentSchema } from "@servis-track/shared";
import { Trash2, User } from "@/components/icons";
import { apiDelete, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMutate } from "@/lib/use-mutate";
import { formatTime } from "@/lib/format";
import type { TicketDetail } from "@/lib/types";
import { shortDate } from "@/components/detail-parts";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function TicketComments({ ticket, onChanged }: { ticket: TicketDetail; onChanged: () => void }) {
  const { user, isAdmin } = useAuth();
  const { run, busy } = useMutate(onChanged);
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function send() {
    const parsed = createCommentSchema.safeParse({ body });
    if (!parsed.success) {
      setErr("Napišite komentar.");
      return;
    }
    setErr(null);
    void run(() => apiPost(`/tickets/${ticket.id}/comments`, parsed.data), "Komentar poslan").then(() =>
      setBody(""),
    );
  }

  const reporterBlind = isAdmin && !ticket.reporterId;

  return (
    <div className="space-y-6">
      {ticket.comments.length === 0 ? (
        <p className="text-sm text-nav-foreground">
          {isAdmin
            ? "Komentarjev še ni. Vprašajte prijavitelja, kar potrebujete - odgovori tukaj."
            : "Komentarjev še ni. Tu vam skrbnik lahko postavi vprašanje ali sporoči, kako napreduje popravilo."}
        </p>
      ) : (
        <ul className="space-y-6">
          {ticket.comments.map((c) => {
            const a = c.author;
            const mine = a?.id === user?.id;
            return (
              <li key={c.id} className="group/row flex gap-3.5">
                {a ? (
                  <UserAvatar
                    user={{
                      id: a.id,
                      name: a.name,
                      username: a.username,
                      hasImage: a.image != null,
                      imageUpdatedAt: a.image?.updatedAt ?? null,
                    }}
                    className="size-8 dark:brightness-[0.88] dark:saturate-[0.85]"
                  />
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-inset text-nav-foreground">
                    <User className="size-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex h-5 items-center gap-2 text-sm">
                    <span className="truncate font-semibold">{a ? (a.name ?? a.username) : "Izbrisan uporabnik"}</span>
                    <span className="shrink-0 text-xs text-nav-foreground tabular-nums">
                      {shortDate(c.createdAt)} ob {formatTime(c.createdAt)}
                    </span>
                    {(mine || isAdmin) && (
                      <span className="ml-auto opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
                        <IconAction label="Izbriši komentar">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Izbriši komentar"
                            className="size-7 text-nav-foreground hover:text-destructive"
                            disabled={busy}
                            onClick={() =>
                              void run(() => apiDelete(`/tickets/${ticket.id}/comments/${c.id}`), "Komentar izbrisan")
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </IconAction>
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed whitespace-pre-line text-muted-foreground">
                    {c.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div
        className={cn(
          "overflow-hidden rounded-lg border bg-field shadow-sm shadow-halo-soft transition-colors focus-within:border-foreground/50",
          err && "border-destructive",
        )}
      >
        <textarea
          aria-label="Nov komentar"
          placeholder={isAdmin ? "Vprašanje ali sporočilo prijavitelju…" : "Odgovor ali dopolnitev prijave…"}
          value={body}
          maxLength={COMMENT_MAX}
          aria-invalid={!!err}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
          className="block min-h-20 w-full resize-y bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-3 border-t px-3.5 py-2">
          <p className={cn("text-xs", err ? "text-destructive" : "text-nav-foreground")}>
            {err ??
              (reporterBlind
                ? "Prijava je prišla iz DiTracka brez povezanega delavca, zato prijavitelj komentarjev ne vidi."
                : isAdmin
                  ? "Ctrl+Enter pošlje. Prijavitelj komentar vidi na ticketu."
                  : "Ctrl+Enter pošlje. Skrbnik dobi obvestilo po e-pošti.")}
          </p>
          <Button size="sm" className="shrink-0" disabled={busy || !body.trim()} onClick={send}>
            Pošlji
          </Button>
        </div>
      </div>
    </div>
  );
}
