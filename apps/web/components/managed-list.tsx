"use client";

import { useState, type ReactNode } from "react";
import { Check, Layers, Pencil, Plus, Trash2, X, type IconComponent } from "@/components/icons";
import { apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useMutate } from "@/lib/use-mutate";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/tooltip";
import { EmptyNote } from "@/components/detail-parts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ManagedItem = {
  id: string;
  name: string;
  _count?: { machines?: number; tasks?: number; articles?: number };
  color?: string;
  icon?: string;
};

export function ManagedList({
  endpoint,
  items,
  onChanged,
  addPlaceholder,
  emptyText,
  addedToast,
  renamedToast,
  deletedToast,
  deleteTitle,
  deleteBody,
  count = (it) => it._count?.machines ?? 0,
  countLabel,
  countIcon: CountIcon = Layers,
  createExtra,
  renderLeading,
}: {
  endpoint: string;
  items: ManagedItem[];
  onChanged: () => Promise<void>;
  addPlaceholder: string;
  emptyText: string;
  addedToast: string;
  renamedToast: string;
  deletedToast: string;
  deleteTitle: string;
  deleteBody: (item: ManagedItem) => ReactNode;
  count?: (item: ManagedItem) => number;
  countLabel?: (n: number) => string;
  countIcon?: IconComponent;
  createExtra?: () => Record<string, unknown>;
  renderLeading?: (
    item: ManagedItem,
    update: (data: Record<string, unknown>, toast: string) => void,
    busy: boolean,
  ) => ReactNode;
}) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirming, setConfirming] = useState<ManagedItem | null>(null);

  const { run, busy } = useMutate(onChanged);

  const add = () => {
    if (!name.trim() || busy) return;
    void run(() => apiPost(endpoint, { name: name.trim(), ...createExtra?.() }), addedToast).then(() =>
      setName(""),
    );
  };
  const rename = (it: ManagedItem) => {
    if (!editName.trim() || busy) return;
    void run(() => apiPatch(`${endpoint}/${it.id}`, { name: editName.trim() }), renamedToast).then(() =>
      setEditingId(null),
    );
  };

  const row = "group/row -mx-2 flex h-10 items-center gap-3 rounded-md px-2 text-sm";

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <EmptyNote icon={CountIcon} title={emptyText}>
          Dodajte prvega spodaj.
        </EmptyNote>
      ) : (
        <ul>
          {items.map((it) => {
            const n = count(it);
            return (
              <li key={it.id}>
                {editingId === it.id ? (
                  <div className={`${row} bg-surface-hover`}>
                    <input
                      autoFocus
                      aria-label="Novo ime"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") rename(it);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="min-w-0 flex-1 bg-transparent outline-none"
                    />
                    <IconAction label="Shrani (Enter)">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Shrani"
                        disabled={busy || !editName.trim()}
                        onClick={() => rename(it)}
                      >
                        <Check className="size-4" />
                      </Button>
                    </IconAction>
                    <IconAction label="Prekliči (Esc)">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Prekliči"
                        className="text-nav-foreground"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </IconAction>
                  </div>
                ) : (
                  <div className={`${row} transition-colors hover:bg-surface-hover`}>
                    {renderLeading?.(
                      it,
                      (data, toast) => void run(() => apiPatch(`${endpoint}/${it.id}`, data), toast),
                      busy,
                    )}
                    <span className="min-w-0 flex-1 truncate">{it.name}</span>
                    <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
                      <IconAction label="Preimenuj">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Preimenuj"
                          className="size-7 text-nav-foreground"
                          onClick={() => {
                            setEditingId(it.id);
                            setEditName(it.name);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </IconAction>
                      <IconAction label="Izbriši">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Izbriši"
                          className="size-7 text-nav-foreground hover:text-destructive"
                          disabled={busy}
                          onClick={() => setConfirming(it)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </IconAction>
                    </span>
                    <span
                      title={countLabel ? `${n} ${countLabel(n)}` : undefined}
                      className="inline-flex h-6 min-w-12 shrink-0 items-center justify-center gap-1 rounded-md border px-1.5 text-xs text-nav-foreground tabular-nums"
                    >
                      <CountIcon className="size-3.5" />
                      {n}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-input px-3 transition-colors focus-within:border-border-row-hover hover:border-border-row-hover">
        <Plus className="size-4 shrink-0 text-nav-foreground" />
        <input
          aria-label={addPlaceholder}
          placeholder={addPlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-nav-foreground"
        />
        {name.trim() && (
          <Button size="xs" disabled={busy} onClick={add}>
            Dodaj
          </Button>
        )}
      </div>

      <Dialog open={confirming !== null} onOpenChange={(v) => !v && setConfirming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 shrink-0" />
              {deleteTitle}
            </DialogTitle>
            <DialogDescription>{confirming && deleteBody(confirming)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Prekliči
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                const target = confirming;
                if (!target) return;
                void run(() => apiDelete(`${endpoint}/${target.id}`), deletedToast).then(() =>
                  setConfirming(null),
                );
              }}
            >
              Izbriši
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
