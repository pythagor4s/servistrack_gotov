"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EXTERNAL_CODE_KINDS, type ExternalCodeKind } from "@servis-track/shared";
import { Cog, Network, Plus, Shapes, Trash2, User, type IconComponent } from "@/components/icons";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useMutate } from "@/lib/use-mutate";
import { useFaultCategories, FAULT_ICON } from "@/lib/fault-categories";
import type { AppUser, Department, ExternalCode, Machine } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { NONE } from "@/components/scope-picker";
import { EmptyNote, SectionTitle } from "@/components/detail-parts";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const KIND_META: Record<ExternalCodeKind, { label: string; icon: IconComponent; empty: string }> = {
  MACHINE: { label: "Delovno mesto", icon: Cog, empty: "Poveži s strojem…" },
  DEPARTMENT: { label: "Oddelek", icon: Network, empty: "Poveži z oddelkom…" },
  CATEGORY: { label: "Kategorija napake", icon: Shapes, empty: "Poveži s kategorijo…" },
  WORKER: { label: "Delavec", icon: User, empty: "Poveži z delavcem…" },
};

const KIND_OPTIONS: ComboboxOption[] = EXTERNAL_CODE_KINDS.map((k) => ({
  value: k,
  label: KIND_META[k].label,
  icon: KIND_META[k].icon,
}));

function targetOf(c: ExternalCode): string | null {
  return c.machineId ?? c.departmentId ?? c.categoryId ?? c.userId;
}

export function ExternalCodesSection() {
  const { data: codes, refetch } = useApi<ExternalCode[]>("/external-codes");
  const { data: machines } = useApi<Machine[]>("/machines");
  const { data: departments } = useApi<Department[]>("/departments");
  const { data: categories } = useFaultCategories();
  const { data: users } = useApi<AppUser[]>("/users");
  const { run, busy } = useMutate(refetch);
  const [kind, setKind] = useState<ExternalCodeKind>("MACHINE");
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState<ExternalCode | null>(null);

  const none: ComboboxOption = { value: NONE, label: "Ni povezano" };
  const options: Record<ExternalCodeKind, ComboboxOption[]> = {
    MACHINE: [
      none,
      ...(machines ?? []).map((m) => ({
        value: m.id,
        label: `${m.brand} ${m.model}`,
        group: m.department?.name ?? "Brez oddelka",
        keywords: m.serialNo ?? undefined,
      })),
    ],
    DEPARTMENT: [none, ...(departments ?? []).map((d) => ({ value: d.id, label: d.name }))],
    CATEGORY: [
      none,
      ...(categories ?? []).map((c) => ({ value: c.id, label: c.name, icon: FAULT_ICON[c.icon] })),
    ],
    WORKER: [
      none,
      ...(users ?? []).map((u) => ({ value: u.id, label: u.name ?? u.username, keywords: u.username })),
    ],
  };

  const unmapped = (codes ?? []).filter((c) => targetOf(c) === null).length;

  const map = (c: ExternalCode, targetId: string) =>
    run(async () => {
      const r = await apiPatch<{ relinked: number }>(`/external-codes/${c.id}`, {
        targetId: targetId === NONE ? null : targetId,
      });
      if (r.relinked > 0) toast.info(`Povezanih ${r.relinked} ticketov, ki so prišli prej.`);
    }, targetId === NONE ? "Povezava odstranjena" : "Šifra povezana");

  const add = () => {
    if (!code.trim() || busy) return;
    void run(() => apiPost("/external-codes", { kind, code: code.trim() }), "Šifra dodana").then(() =>
      setCode(""),
    );
  };

  const row = "group/row -mx-2 flex min-h-10 items-center gap-3 rounded-md px-2 py-1 text-sm";

  return (
    <section className="min-w-0 space-y-4 lg:col-span-2">
      <SectionTitle
        action={
          <span className="text-sm text-nav-foreground tabular-nums">
            {unmapped > 0 ? `${unmapped} nepovezanih · ` : ""}
            {codes?.length ?? 0}
          </span>
        }
      >
        Šifre DiTrack
      </SectionTitle>
      <p className="text-sm text-nav-foreground">
        DiTrack pri prijavi napake pošlje svoje šifre: delovno mesto, oddelek, kategorijo in številko
        delavca. Vsaka nova šifra se prikaže tukaj. Ko jo povežete, se ticketi s to šifro povežejo sami,
        tudi tisti, ki so prišli prej.
      </p>

      {codes && codes.length === 0 ? (
        <EmptyNote icon={Cog} title="Šifer še ni">
          Pojavijo se ob prvi prijavi iz DiTracka. Lahko jih dodate tudi vnaprej spodaj.
        </EmptyNote>
      ) : (
        <ul>
          {(codes ?? []).map((c) => {
            const meta = KIND_META[c.kind];
            const KindIcon = meta.icon;
            return (
              <li key={c.id} className={`${row} transition-colors hover:bg-surface-hover`}>
                <KindIcon className="size-4 shrink-0 text-nav-foreground" aria-label={meta.label} />
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    <span className="font-medium tabular-nums">{c.code}</span>
                    {c.label && <span className="text-nav-foreground"> · {c.label}</span>}
                  </p>
                  <p className="truncate text-xs text-nav-foreground">
                    {meta.label}
                    {c.lastSeenAt
                      ? ` · ${c.seenCount}× iz DiTracka, zadnjič ${formatDateTime(c.lastSeenAt)}`
                      : " · dodana ročno"}
                  </p>
                </div>
                <div className="flex w-56 shrink-0 justify-start">
                  <Combobox
                    variant="inline"
                    value={targetOf(c) ?? NONE}
                    onChange={(v) => void map(c, v)}
                    options={options[c.kind]}
                    emptyValue={NONE}
                    placeholder={meta.empty}
                    searchable
                    disabled={busy}
                  />
                </div>
                <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
                  <IconAction label="Izbriši">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Izbriši"
                      className="size-7 text-nav-foreground hover:text-destructive"
                      disabled={busy}
                      onClick={() => setConfirming(c)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </IconAction>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-input px-3 transition-colors focus-within:border-border-row-hover hover:border-border-row-hover">
        <Plus className="size-4 shrink-0 text-nav-foreground" />
        <Combobox
          variant="inline"
          value={kind}
          onChange={(v) => setKind(v as ExternalCodeKind)}
          options={KIND_OPTIONS}
        />
        <input
          aria-label="Šifra v DiTracku"
          placeholder="Šifra v DiTracku"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-nav-foreground"
        />
        {code.trim() && (
          <Button size="xs" disabled={busy} onClick={add}>
            Dodaj
          </Button>
        )}
      </div>

      {confirming && (
        <ConfirmDelete
          code={confirming}
          busy={busy}
          onCancel={() => setConfirming(null)}
          onConfirm={() =>
            void run(() => apiDelete(`/external-codes/${confirming.id}`), "Šifra izbrisana").then(() =>
              setConfirming(null),
            )
          }
        />
      )}
    </section>
  );
}

function ConfirmDelete({
  code,
  busy,
  onCancel,
  onConfirm,
}: {
  code: ExternalCode;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 shrink-0" />
            Brisanje šifre
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-primary">{code.code}</span> bo odstranjena. Ticketi, ki so
            že povezani, ostanejo, kakršni so. Če jo DiTrack pošlje znova, se vrne kot nepovezana.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Prekliči
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            Izbriši
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
