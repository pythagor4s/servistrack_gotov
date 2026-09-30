"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Mail, Pencil, Plus, CircleDot, Trash2, Wrench, Building2, Phone, MapPin, Copy } from "@/components/icons";
import { RowContextMenu, copyValue } from "@/components/row-context-menu";
import { ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "@/components/ui/context-menu";
import { ActivityBadge } from "@/components/badges";
import { PageDate } from "@/components/page-date";
import { FlashInput } from "@/components/ui/flash-input";
import { PropertyInput, PropertyList, PropertyRow } from "@/components/ui/property-list";
import { createServicerSchema, updateServicerSchema } from "@servis-track/shared";
import { apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { paramOr, useFiltersInUrl } from "@/lib/url-filters";
import { useIsDesktop } from "@/lib/use-media";
import { useListView } from "@/lib/view-preference";
import { validateForm, type FieldErrors } from "@/lib/form";
import type { Servicer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, useClientPage, PageStep } from "@/components/ui/pagination";
import { useDevicePrefs } from "@/lib/device-prefs";
import { useMutate } from "@/lib/use-mutate";
import { ToggleRow, DangerZone } from "@/components/dialog-rows";
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
import { BarCircle, MobileBarActions } from "@/components/mobile-action-bar";
import { CopyableValue } from "@/components/copyable";
import { PhoneNumber } from "@/components/phone-number";
import { Loader } from "@/components/loader";
import { ServicerCard, ServicerCardSkeleton } from "@/components/servicer-card";
import { onTintCursorMoveRow } from "@/components/hover-tint";
import { SearchInput } from "@/components/ui/search-input";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { ticketCountLabel } from "@/lib/format";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_OPTIONS: ComboboxOption[] = [
  { value: "active", label: "Aktivni serviserji" },
  { value: "inactive", label: "Neaktivni serviserji" },
  { value: "all", label: "Vsi serviserji" },
];

const CARD_PAGE_SIZE = 24;

export default function ServicersPage() {
  return (
    <Suspense fallback={null}>
      <ServicersPageInner />
    </Suspense>
  );
}

function ServicersPageInner() {
  const params = useSearchParams();
  const { data, loading, error, refetch } = useApi<Servicer[]>("/servicers");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Servicer | null>(null);
  const [deleting, setDeleting] = useState<Servicer | null>(null);
  const [status, setStatus] = useState(() =>
    paramOr(params, "status", "active", STATUS_OPTIONS.map((o) => o.value)),
  );
  const [q, setQ] = useState(() => paramOr(params, "q", ""));
  const [filtersOpen, setFiltersOpen] = useState(() =>
    ["status"].some((k) => params.get(k)),
  );
  useFiltersInUrl({ status, q: q.trim() }, { status: "active", q: "" });
  const { view } = useListView("servicers");
  const isDesktop = useIsDesktop(true);
  const showCards = !isDesktop || view === "CARDS";

  const needle = q.trim().toLowerCase();
  const visible = (data ?? []).filter((s) => {
    if (status !== "all" && (status === "active" ? !s.active : s.active)) return false;
    if (!needle) return true;
    const hay = `${s.name} ${s.email} ${s.phone ?? ""} ${s.specialty ?? ""} ${s.address ?? ""}`;
    return hay.toLowerCase().includes(needle);
  });

  const { pageSize: tablePageSize } = useDevicePrefs();
  const pageSize = showCards ? CARD_PAGE_SIZE : tablePageSize;
  const { page, setPage, pageCount, paged } = useClientPage(visible, pageSize);

  useEffect(() => {
    setPage(0);
  }, [status, q]);

  const { run: mutate } = useMutate(refetch);

  const activeFilterCount = status !== "active" ? 1 : 0;
  const filtersActive = activeFilterCount > 0 || q !== "";

  function clearFilters() {
    setStatus("active");
    setQ("");
  }

  const FILTER_WIDTH = "w-[13.75rem]";

  const filterControls = (
    <Combobox
      value={status}
      onChange={setStatus}
      options={STATUS_OPTIONS}
      icon={CircleDot}
      className={FILTER_WIDTH}
    />
  );

  const activeFilterLabels = [
    status !== "active" && optionLabel(STATUS_OPTIONS, status),
  ].filter((l): l is string => typeof l === "string");
  const resultsSummary =
    loading && !data ? null : (
      <ResultsSummary
        page={page}
        pageSize={pageSize}
        total={visible.length}
        filters={activeFilterLabels}
      />
    );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SearchRow
          leading={<PageDate />}
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" strokeWidth={2.1} /> Dodaj serviserja
            </Button>
          }
        >
          <SearchInput
            aria-label="Iskanje serviserjev"
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
                  controls="servicer-filters"
                />
              </>
            }
          />
        </SearchRow>

        <FilterRevealRow
          id="servicer-filters"
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
            title="Filtri serviserjev"
            activeCount={activeFilterCount}
            onClear={clearFilters}
          >
            {filterControls}
          </MobileFilters>
          <BarCircle label="Dodaj serviserja" variant="primary" onClick={() => setAddOpen(true)}>
            <Plus />
          </BarCircle>
        </MobileBarActions>
      </div>

      {showCards && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {loading && Array.from({ length: 6 }).map((_, i) => <ServicerCardSkeleton key={i} />)}

          {!loading &&
            !error &&
            paged.map((s) => (
              <div key={s.id} className="h-full">
                <ServicerCard servicer={s} onEdit={() => setEditing(s)} />
              </div>
            ))}
        </div>
      )}

      {showCards && !loading && error && (
        <p className="py-10 text-center text-sm text-destructive">{error}</p>
      )}
      {showCards && !loading && !error && visible.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {data && data.length > 0
            ? "Ni serviserjev, ki bi ustrezali filtru."
            : "Serviserjev še ni."}
        </p>
      )}

      {!showCards && (
      <div className={TABLE_FRAME}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead icon={Building2}>Naziv</TableHead>
              <TableHead icon={Mail}>E-pošta</TableHead>
              <TableHead icon={Phone}>Telefon</TableHead>
              <TableHead icon={Wrench}>Področje</TableHead>
              <TableHead icon={MapPin}>Naslov</TableHead>
              <TableHead icon={CircleDot}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="animate-skeleton-appear">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && visible.length === 0 && (
              <TableEmpty colSpan={6}>
                {data && data.length > 0
                  ? "Ni serviserjev, ki bi ustrezali filtru."
                  : "Serviserjev še ni."}
              </TableEmpty>
            )}
            {!loading &&
              !error &&
              paged.map((s, i) => (
                <RowContextMenu
                  key={s.id}
                  items={
                    <>
                      <ContextMenuLabel>{s.name}</ContextMenuLabel>
                      <ContextMenuItem onSelect={() => (window.location.href = `mailto:${s.email}`)}>
                        <Mail /> Pošlji e-pošto
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => void copyValue(s.email, "E-pošta kopirana")}>
                        <Copy /> Kopiraj e-pošto
                      </ContextMenuItem>
                      {s.phone && (
                        <>
                          <ContextMenuItem onSelect={() => (window.location.href = `tel:${s.phone!.replace(/\s/g, "")}`)}>
                            <Phone /> Pokliči
                          </ContextMenuItem>
                          <ContextMenuItem onSelect={() => void copyValue(s.phone!, "Telefon kopiran")}>
                            <Copy /> Kopiraj telefon
                          </ContextMenuItem>
                        </>
                      )}
                      {s.address && (
                        <ContextMenuItem onSelect={() => void copyValue(s.address!, "Naslov kopiran")}>
                          <MapPin /> Kopiraj naslov
                        </ContextMenuItem>
                      )}
                      <ContextMenuSeparator />
                      <ContextMenuItem onSelect={() => setEditing(s)}>
                        <Pencil /> Uredi
                      </ContextMenuItem>
                      <ContextMenuItem destructive onSelect={() => setDeleting(s)}>
                        <Trash2 /> Izbriši…
                      </ContextMenuItem>
                    </>
                  }
                >
                <TableRow
                  zebra={i}
                  data-row-tint="neutral"
                  onPointerMove={onTintCursorMoveRow}
                  tabIndex={0}
                  className="text-muted-foreground focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-ring"
                >
                  <TableCell>{s.name}</TableCell>
                  <TableCell>
                    <CopyableValue
                      value={s.email}
                      icon={Mail}
                      showIcon={false}
                      copiedLabel="E-pošta kopirana"
                      toastId="copy-email"
                    />
                  </TableCell>
                  <TableCell>
                    <PhoneNumber phone={s.phone} icon={false} />
                  </TableCell>
                  <TableCell>{s.specialty ?? <EmptyCell />}</TableCell>
                  <TableCell>{s.address ?? <EmptyCell />}</TableCell>
                  <TableCell>
                    <ActivityBadge active={s.active} />
                  </TableCell>
                </TableRow>
                </RowContextMenu>
              ))}
          </TableBody>
        </Table>
      </div>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <ServicerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={() => {
          setAddOpen(false);
          void refetch();
        }}
      />
      <ServicerDialog
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
        initial={editing ?? undefined}
        onDone={() => {
          setEditing(null);
          void refetch();
        }}
        onSaveExisting={(id, patch) =>
          mutate(() => apiPatch(`/servicers/${id}`, patch), "Serviser posodobljen")
        }
        onRequestDelete={() => editing && setDeleting(editing)}
      />
      <DeleteServicerDialog
        open={deleting !== null}
        onOpenChange={(v) => !v && setDeleting(null)}
        servicer={deleting}
        onConfirm={() => {
          const target = deleting;
          if (!target) return;
          void mutate(() => apiDelete(`/servicers/${target.id}`), "Serviser izbrisan").then(
            () => {
              setDeleting(null);
              setEditing(null);
            },
          );
        }}
      />
    </div>
  );
}

function ServicerDialog({
  open,
  onOpenChange,
  initial,
  onDone,
  onSaveExisting,
  onRequestDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Servicer;
  onDone: () => void;
  onSaveExisting?: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onRequestDelete?: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [address, setAddress] = useState("");
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setEmail(initial?.email ?? "");
      setPhone(initial?.phone ?? "");
      setSpecialty(initial?.specialty ?? "");
      setAddress(initial?.address ?? "");
      setActive(initial?.active ?? true);
      setErrors({});
      setBusy(false);
    }
  }, [open, initial]);

  const opt = (s: string) => (s.trim() ? s.trim() : undefined);
  const nullable = (s: string) => (s.trim() ? s.trim() : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit && initial && onSaveExisting) {
      const patch = {
        name: name.trim(),
        email: email.trim(),
        phone: nullable(phone),
        specialty: nullable(specialty),
        address: nullable(address),
        active,
      };
      const parsed = validateForm(updateServicerSchema, patch);
      if (!parsed.ok) return setErrors(parsed.errors);
      setErrors({});
      setBusy(true);
      await onSaveExisting(initial.id, patch);
      onDone();
      return;
    }

    const parsed = validateForm(createServicerSchema, {
      name: name.trim(),
      email: email.trim(),
      phone: opt(phone),
      specialty: opt(specialty),
      address: opt(address),
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await apiPost("/servicers", parsed.data);
      toast.success("Serviser dodan");
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Serviserja ni bilo mogoče dodati");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[26rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-5 shrink-0" />
            {isEdit ? "Uredi serviserja" : "Dodaj serviserja"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Zunanje podjetje, ki mu je mogoče posredovati ticket. Obvestilo o posredovanju
            gre na spodnjo e-pošto in telefon.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <FlashInput
              aria-label="Naziv"
              placeholder="Naziv podjetja"
              value={name}
              aria-invalid={!!errors.name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-semibold"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <PropertyList>
            <PropertyRow label="E-pošta" error={errors.email}>
              <PropertyInput
                type="email"
                aria-label="E-pošta"
                placeholder="servis@grafo.si"
                value={email}
                aria-invalid={!!errors.email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </PropertyRow>
            <PropertyRow label="Telefon">
              <PropertyInput
                aria-label="Telefon"
                placeholder="+386 41 200 201"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </PropertyRow>
            <PropertyRow label="Področje">
              <PropertyInput
                aria-label="Področje"
                placeholder="Rezalni ploterji"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              />
            </PropertyRow>
            <PropertyRow label="Naslov">
              <PropertyInput
                aria-label="Naslov"
                placeholder="Ulica, pošta in kraj"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </PropertyRow>
          </PropertyList>
          {isEdit && (
            <ToggleRow
              label="Aktiven"
              description="Neaktivni serviserji ostanejo na preteklih ticketih, a izpadejo iz privzetega seznama."
              checked={active}
              onCheckedChange={setActive}
            />
          )}
          {isEdit && onRequestDelete && (
            <DangerZone
              label="Izbriši tega serviserja"
              description="Trajno in drugače kot deaktivacija: podjetje se izbriše iz baze."
              actionLabel="Izbriši"
              onAction={onRequestDelete}
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Prekliči
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Loader className="size-5" label="" />
                  Shranjevanje…
                </>
              ) : isEdit ? (
                "Shrani spremembe"
              ) : (
                "Dodaj serviserja"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteServicerDialog({
  open,
  onOpenChange,
  servicer,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  servicer: Servicer | null;
  onConfirm: () => void;
}) {
  const count = servicer?._count?.tickets ?? 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 shrink-0" />
            Brisanje serviserja
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-primary">{servicer?.name}</span> bo dokončno
            odstranjen iz baze. Tega ni mogoče razveljaviti.
            {count > 0
              ? ` ${count} ${ticketCountLabel(count)}, posredovanih temu serviserju, se ohrani,
                 a ostane brez navedenega serviserja. Če želite ta zapis ohraniti, ga raje
                 deaktivirajte.`
              : " Če ga želite upokojiti in ohraniti berljivega na preteklih ticketih, ga raje deaktivirajte."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Izbriši serviserja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
