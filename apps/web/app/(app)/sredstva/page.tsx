"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, QrCode, Network, Shapes, ChartNoAxesGantt, ArrowDownAZ, ArrowUpAZ, ImageOff, Cog, Link2, Trash2, LayoutList, Hash, NotebookPen, CircleDot, Tags, BookOpen, Copy, Clock } from "@/components/icons";
import { RowContextMenu, copyValue } from "@/components/row-context-menu";
import { ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "@/components/ui/context-menu";
import { PageDate } from "@/components/page-date";
import { DepartmentBadge } from "@/components/department-badge";
import { FlashInput } from "@/components/ui/flash-input";
import { PropertyInput, PropertyList, PropertyRow } from "@/components/ui/property-list";
import { createMachineSchema, updateMachineSchema, MACHINE_IMAGE } from "@servis-track/shared";
import { apiPost, apiPatch, apiDelete, apiUpload } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { paramOr, useFiltersInUrl } from "@/lib/url-filters";
import { useAuth } from "@/lib/auth";
import { useIsDesktop } from "@/lib/use-media";
import { useListView } from "@/lib/view-preference";
import { validateForm, type FieldErrors } from "@/lib/form";
import type { Department, Machine, MachineType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SearchInput } from "@/components/ui/search-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
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
import { MachineHistoryDrawer } from "@/components/machine-history-drawer";
import { MachineCard, MachineCardSkeleton } from "@/components/machine-card";
import { onTintCursorMoveRow } from "@/components/hover-tint";
import { ImageField, checkImageFile } from "@/components/image-field";
import { TruncatedHint } from "@/components/ui/tooltip";
import { ticketCountLabel } from "@/lib/format";
import { ToggleRow, DangerZone } from "@/components/dialog-rows";
import { Pagination, useClientPage, PageStep } from "@/components/ui/pagination";
import { useDevicePrefs } from "@/lib/device-prefs";
import { useMutate } from "@/lib/use-mutate";
import { Skeleton } from "@/components/ui/skeleton";
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

const ALL = "ALL";
const NONE = "NONE";

const SORT_OPTIONS: ComboboxOption[] = [
  { value: "brand-asc", label: "Znamka A–Ž", icon: ArrowDownAZ },
  { value: "brand-desc", label: "Znamka Ž–A", icon: ArrowUpAZ },
];

const CARD_PAGE_SIZE = 24;

export default function MachinesPage() {
  return (
    <Suspense fallback={null}>
      <MachinesPageInner />
    </Suspense>
  );
}

function MachinesPageInner() {
  const { isAdmin } = useAuth();
  const COLUMNS = 6;
  const router = useRouter();
  const openMachineId = useSearchParams().get("machine");
  const { data: machines, loading, error, refetch } = useApi<Machine[]>("/machines");
  const { data: departments } = useApi<Department[]>("/departments");
  const { data: machineTypes } = useApi<MachineType[]>("/machine-types");

  const params = useSearchParams();
  const [q, setQ] = useState(() => paramOr(params, "q", ""));
  const [filtersOpen, setFiltersOpen] = useState(() =>
    ["departmentId", "typeId", "brand", "sort"].some((k) => params.get(k)),
  );
  const [dept, setDept] = useState(() => paramOr(params, "departmentId", ALL));
  const [brand, setBrand] = useState(() => paramOr(params, "brand", ALL));
  const [typeFilter, setTypeFilter] = useState(() => paramOr(params, "typeId", ALL));
  const [sort, setSort] = useState(() =>
    paramOr(params, "sort", "brand-asc", SORT_OPTIONS.map((o) => o.value)),
  );
  useFiltersInUrl(
    { q: q.trim(), departmentId: dept, typeId: typeFilter, brand, sort },
    { q: "", departmentId: ALL, typeId: ALL, brand: ALL, sort: "brand-asc" },
  );
  function machineHref(id: string | null) {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("machine", id);
    else next.delete("machine");
    const qs = next.toString();
    return qs ? `/sredstva?${qs}` : "/sredstva";
  }
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [deleting, setDeleting] = useState<Machine | null>(null);
  const { view } = useListView("machines");
  const isDesktop = useIsDesktop(true);
  const showCards = !isDesktop || view === "CARDS";

  const deptOptions: ComboboxOption[] = [
    { value: ALL, label: "Vsi oddelki" },
    ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];
  const typeOptions: ComboboxOption[] = [
    { value: ALL, label: "Vse vrste" },
    ...(machineTypes ?? []).map((t) => ({ value: t.id, label: t.name })),
  ];
  const brandOptions: ComboboxOption[] = [
    { value: ALL, label: "Vse znamke" },
    ...[...new Set((machines ?? []).map((m) => m.brand))]
      .sort((a, b) => a.localeCompare(b))
      .map((b) => ({ value: b, label: b })),
  ];

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = (machines ?? []).filter((m) => {
      if (dept !== ALL && m.departmentId !== dept) return false;
      if (brand !== ALL && m.brand !== brand) return false;
      if (typeFilter !== ALL && m.typeId !== typeFilter) return false;
      if (needle) {
        const hay = `${m.brand} ${m.model} ${m.serialNo ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    return rows.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      const byBrand = a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model);
      return sort === "brand-desc" ? -byBrand : byBrand;
    });
  }, [machines, q, dept, brand, typeFilter, sort]);

  const filtersActive =
    q !== "" || dept !== ALL || brand !== ALL || typeFilter !== ALL || sort !== "brand-asc";

  const { pageSize: tablePageSize } = useDevicePrefs();
  const pageSize = showCards ? CARD_PAGE_SIZE : tablePageSize;
  const { page, setPage, pageCount, paged } = useClientPage(visible, pageSize);

  useEffect(() => {
    setPage(0);
  }, [q, dept, brand, typeFilter, sort]);

  const { run: mutate } = useMutate(refetch);

  const activeFilterCount = [
    dept !== ALL,
    brand !== ALL,
    typeFilter !== ALL,
    sort !== "brand-asc",
  ].filter(Boolean).length;

  function clearFilters() {
    setQ("");
    setDept(ALL);
    setBrand(ALL);
    setTypeFilter(ALL);
    setSort("brand-asc");
  }

  const FILTER_WIDTH = "w-[13.75rem]";

  const filterControls = (
    <>
      <Combobox
        value={dept}
        onChange={setDept}
        options={deptOptions}
        icon={Network}
        searchable
        searchPlaceholder="Iskanje oddelkov…"
        listClassName="max-h-[22rem]"
        className={FILTER_WIDTH}
      />
      <Combobox
        value={typeFilter}
        onChange={setTypeFilter}
        options={typeOptions}
        icon={Shapes}
        searchable
        searchPlaceholder="Iskanje vrst…"
        className={FILTER_WIDTH}
      />
      <Combobox
        value={brand}
        onChange={setBrand}
        options={brandOptions}
        icon={ChartNoAxesGantt}
        searchable
        searchPlaceholder="Vnesite znamko…"
        className={FILTER_WIDTH}
      />
      <Combobox value={sort} onChange={setSort} options={SORT_OPTIONS} className={FILTER_WIDTH} />
    </>
  );

  const activeFilterLabels = [
    dept !== ALL && optionLabel(deptOptions, dept),
    typeFilter !== ALL && optionLabel(typeOptions, typeFilter),
    brand !== ALL && optionLabel(brandOptions, brand),
    sort !== "brand-asc" && optionLabel(SORT_OPTIONS, sort),
  ].filter((l): l is string => typeof l === "string");
  const resultsSummary =
    loading && !machines ? null : (
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
            isAdmin ? (
              <div className="flex items-center gap-1.5">
                <Button asChild variant="outline" className="bg-header-button">
                  <Link href="/nalepke">
                    <QrCode className="size-4" /> Nalepke QR
                  </Link>
                </Button>
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="size-4" strokeWidth={2.1} /> Dodaj sredstvo
                </Button>
              </div>
            ) : undefined
          }
        >
          <SearchInput
            aria-label="Iskanje po znamki, modelu, serijski"
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
                  controls="machine-filters"
                />
              </>
            }
          />
        </SearchRow>

        <FilterRevealRow
          id="machine-filters"
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
            title="Filtri sredstev"
            activeCount={activeFilterCount}
            onClear={clearFilters}
          >
            {filterControls}
          </MobileFilters>
          {isAdmin && (
            <BarCircle label="Dodaj sredstvo" variant="primary" onClick={() => setAddOpen(true)}>
              <Plus />
            </BarCircle>
          )}
        </MobileBarActions>
      </div>

      {showCards && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => <MachineCardSkeleton key={i} />)}

          {!loading &&
            !error &&
            paged.map((m) => (
              <div key={m.id} className="h-full">
                <MachineCard machine={m} canManage={isAdmin} onEdit={() => setEditing(m)} />
              </div>
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
      {showCards && !loading && !error && visible.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {machines && machines.length > 0
            ? "Ni sredstev, ki bi ustrezali filtrom."
            : "Sredstev še ni. Dodajte prvega."}
        </p>
      )}

      {!showCards && (
      <div className={TABLE_FRAME}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead icon={LayoutList}>Sredstvo</TableHead>
              <TableHead icon={Shapes}>Vrsta</TableHead>
              <TableHead icon={Network}>Oddelek</TableHead>
              <TableHead icon={Hash}>Serijska</TableHead>
              <TableHead icon={NotebookPen}>Opombe</TableHead>
              <TableHead icon={CircleDot}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="animate-skeleton-appear">
                  {Array.from({ length: COLUMNS }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && error && (
              <TableRow>
                <TableCell colSpan={COLUMNS} className="py-10 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={refetch}>
                    Poskusi znova
                  </Button>
                </TableCell>
              </TableRow>
            )}

            {!loading && !error && visible.length === 0 && (
              <TableEmpty colSpan={COLUMNS}>
                {machines && machines.length > 0
                  ? "Ni sredstev, ki bi ustrezali filtrom."
                  : "Sredstev še ni. Dodajte prvega."}
              </TableEmpty>
            )}

            {!loading &&
              !error &&
              paged.map((m, i) => (
                <RowContextMenu
                  key={m.id}
                  items={
                    <>
                      <ContextMenuLabel>
                        {m.brand} {m.model}
                      </ContextMenuLabel>
                      <ContextMenuItem onSelect={() => router.push(machineHref(m.id), { scroll: false })}>
                        <Clock /> Zgodovina servisov
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => router.push(`/zahtevki?machineId=${m.id}`)}>
                        <Tags /> Ticketi za to sredstvo
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => router.push(`/zahtevki?new=1&newMachineId=${m.id}`)}>
                        <Plus /> Prijavi napako
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => router.push(`/znanje?machineId=${m.id}`)}>
                        <BookOpen /> Baza znanja za to sredstvo
                      </ContextMenuItem>
                      {m.serialNo && (
                        <ContextMenuItem onSelect={() => void copyValue(m.serialNo!, "Serijska številka kopirana")}>
                          <Copy /> Kopiraj serijsko številko
                        </ContextMenuItem>
                      )}
                      {isAdmin && (
                        <>
                          <ContextMenuItem onSelect={() => router.push(`/nalepke?ids=${m.id}`)}>
                            <QrCode /> Natisni nalepko QR
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onSelect={() => setEditing(m)}>
                            <Pencil /> Uredi
                          </ContextMenuItem>
                          <ContextMenuItem destructive onSelect={() => setDeleting(m)}>
                            <Trash2 /> Izbriši…
                          </ContextMenuItem>
                        </>
                      )}
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
                  <TableCell>
                    <Link
                      href={machineHref(m.id)}
                      scroll={false}
                      className="underline-offset-4 hover:underline"
                    >
                      {m.brand} {m.model}
                    </Link>
                  </TableCell>
                  <TableCell>{m.type?.name ?? <EmptyCell />}</TableCell>
                  <TableCell>
                    {m.department ? <DepartmentBadge department={m.department} /> : <EmptyCell />}
                  </TableCell>
                  <TableCell>{m.serialNo ?? <EmptyCell />}</TableCell>
                  <TableCell className="max-w-[18rem]">
                    {m.notes ? <TruncatedHint text={m.notes} /> : <EmptyCell />}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={m.active ? "secondary" : "outline"}
                      className="rounded-sm"
                    >
                      {m.active ? "Aktiven" : "Neaktiven"}
                    </Badge>
                  </TableCell>
                </TableRow>
                </RowContextMenu>
              ))}
          </TableBody>
        </Table>
      </div>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <MachineHistoryDrawer
        machineId={openMachineId}
        onClose={() => router.replace(machineHref(null), { scroll: false })}
      />

      <MachineDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Dodaj sredstvo"
        submitLabel="Dodaj sredstvo"
        departments={departments ?? []}
        machineTypes={machineTypes ?? []}
        allMachines={machines ?? []}
        onSubmit={(values, image) =>
          mutate(async () => {
            const created = await apiPost<Machine>("/machines", values);
            if (image) {
              try {
                await apiUpload(`/machines/${created.id}/image`, image);
              } catch {
                toast.error("Sredstvo je dodano, slike ni bilo mogoče naložiti. Dodajte jo prek urejanja.");
              }
            }
          }, "Sredstvo dodano").then(() => setAddOpen(false))
        }
      />
      <MachineDialog
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
        title="Uredi sredstvo"
        submitLabel="Shrani spremembe"
        initial={editing ?? undefined}
        departments={departments ?? []}
        machineTypes={machineTypes ?? []}
        allMachines={machines ?? []}
        onSubmit={(values) =>
          editing &&
          mutate(() => apiPatch(`/machines/${editing.id}`, values), "Sredstvo posodobljeno").then(
            () => setEditing(null),
          )
        }
        onRequestDelete={() => editing && setDeleting(editing)}
        onImageChanged={() => void refetch()}
      />
      <DeleteMachineDialog
        open={deleting !== null}
        onOpenChange={(v) => !v && setDeleting(null)}
        machine={deleting}
        onConfirm={() =>
          deleting &&
          mutate(() => apiDelete(`/machines/${deleting.id}`), "Sredstvo izbrisano").then(() => {
            setDeleting(null);
            setEditing(null);
          })
        }
      />
    </div>
  );
}

const validateImageFile = (file: File) =>
  checkImageFile(file, {
    mimeTypes: MACHINE_IMAGE.mimeTypes,
    maxBytes: MACHINE_IMAGE.maxBytes,
    typeMessage: "Dovoljeni sta samo sliki PNG in WebP.",
    dimensions: ({ width, height }) =>
      width !== MACHINE_IMAGE.width || height !== MACHINE_IMAGE.height
        ? `Slika mora biti natanko ${MACHINE_IMAGE.width} × ${MACHINE_IMAGE.height} slikovnih pik (naložena: ${width} × ${height}).`
        : null,
  });

function MachineDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initial,
  departments,
  machineTypes,
  allMachines,
  onSubmit,
  onRequestDelete,
  onImageChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  submitLabel: string;
  initial?: Machine;
  departments: Department[];
  machineTypes: MachineType[];
  allMachines: Machine[];
  onSubmit: (values: Record<string, unknown>, image: File | null) => void;
  onRequestDelete?: () => void;
  onImageChanged?: () => void;
}) {
  const isEdit = !!initial;
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [departmentId, setDepartmentId] = useState(NONE);
  const [typeId, setTypeId] = useState(NONE);
  const [attachedToId, setAttachedToId] = useState(NONE);
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pendingImage, setPendingImage] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setBrand(initial?.brand ?? "");
      setModel(initial?.model ?? "");
      setSerialNo(initial?.serialNo ?? "");
      setDepartmentId(initial?.departmentId ?? NONE);
      setTypeId(initial?.typeId ?? NONE);
      setAttachedToId(initial?.attachedToId ?? NONE);
      setActive(initial?.active ?? true);
      setNotes(initial?.notes ?? "");
      setPendingImage(null);
      setErrors({});
    }
  }, [open, initial]);

  function submit() {
    if (isEdit) {
      const patch = {
        brand: brand.trim(),
        model: model.trim(),
        serialNo: serialNo.trim() ? serialNo.trim() : null,
        departmentId: departmentId === NONE ? null : departmentId,
        typeId: typeId === NONE ? null : typeId,
        attachedToId: attachedToId === NONE ? null : attachedToId,
        active,
        notes: notes.trim() ? notes.trim() : null,
      };
      const parsed = validateForm(updateMachineSchema, patch);
      if (!parsed.ok) return setErrors(parsed.errors);
      setErrors({});
      onSubmit(patch, null);
    } else {
      const values = {
        brand: brand.trim(),
        model: model.trim(),
        serialNo: serialNo.trim() ? serialNo.trim() : undefined,
        departmentId: departmentId === NONE ? undefined : departmentId,
        typeId: typeId === NONE ? undefined : typeId,
        attachedToId: attachedToId === NONE ? undefined : attachedToId,
        active,
        notes: notes.trim() ? notes.trim() : undefined,
      };
      const parsed = validateForm(createMachineSchema, values);
      if (!parsed.ok) return setErrors(parsed.errors);
      setErrors({});
      onSubmit(values, pendingImage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[28rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cog className="size-5 shrink-0" />
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Sredstvo v obratu. Njegov oddelek podeduje vsak ticket, ki se nanaša nanj.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <FlashInput
                aria-label="Znamka"
                placeholder="Znamka"
                value={brand}
                aria-invalid={!!errors.brand}
                onChange={(e) => setBrand(e.target.value)}
                className="text-lg font-semibold"
              />
              <FlashInput
                aria-label="Model"
                placeholder="Model"
                value={model}
                aria-invalid={!!errors.model}
                onChange={(e) => setModel(e.target.value)}
                className="text-lg font-semibold"
              />
            </div>
            {(errors.brand || errors.model) && (
              <p className="text-sm text-destructive">{errors.brand ?? errors.model}</p>
            )}
          </div>

          <PropertyList>
            <PropertyRow label="Oddelek">
              <Combobox
                variant="inline"
                emptyValue={NONE}
                value={departmentId}
                onChange={setDepartmentId}
                icon={Network}
                searchable
                searchPlaceholder="Iskanje oddelkov…"
                listClassName="max-h-60"
                options={[
                  { value: NONE, label: "Brez" },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </PropertyRow>
            <PropertyRow label="Serijska / enota">
              <PropertyInput
                aria-label="Serijska / enota"
                placeholder="#2"
                value={serialNo}
                onChange={(e) => setSerialNo(e.target.value)}
              />
            </PropertyRow>
            <PropertyRow label="Vrsta">
              <Combobox
                variant="inline"
                emptyValue={NONE}
                value={typeId}
                onChange={setTypeId}
                icon={Shapes}
                searchable
                searchPlaceholder="Iskanje vrst…"
                listClassName="max-h-60"
                options={[
                  { value: NONE, label: "Brez" },
                  ...machineTypes.map((t) => ({ value: t.id, label: t.name })),
                ]}
              />
            </PropertyRow>
            <PropertyRow label="Vezano na">
              <Combobox
                variant="inline"
                emptyValue={NONE}
                value={attachedToId}
                onChange={setAttachedToId}
                icon={Link2}
                searchable
                searchPlaceholder="Iskanje sredstev…"
                listClassName="max-h-60"
                options={[
                  { value: NONE, label: "Brez" },
                  ...allMachines
                    .filter((m) => m.id !== initial?.id)
                    .map((m) => ({ value: m.id, label: `${m.brand} ${m.model}` })),
                ]}
              />
            </PropertyRow>
          </PropertyList>

          <Separator />
          <div className="space-y-3">
            <Label htmlFor="m-notes" className="font-normal text-muted-foreground">
              Opombe
            </Label>
            <Textarea
              id="m-notes"
              rows={3}
              placeholder="Lokacija, posebnosti, servisna pogodba…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <ImageField
            key={initial?.id ?? "new"}
            label="Slika sredstva"
            resource="machines"
            id={initial?.id ?? null}
            initialHasImage={!!initial?.hasImage}
            accept={MACHINE_IMAGE.mimeTypes.join(",")}
            hint={`PNG ali WebP | ${MACHINE_IMAGE.width} × ${MACHINE_IMAGE.height} pikselov`}
            frameClassName="aspect-3/2 w-28 rounded-md"
            fit="contain"
            placeholder={<ImageOff className="size-5 text-muted-foreground" />}
            check={validateImageFile}
            onPick={setPendingImage}
            onChanged={() => onImageChanged?.()}
          />
          <ToggleRow
            label="Aktiven"
            description="Neaktivno sredstvo je označeno kot izven uporabe; njegovi ticketi in zgodovina se ohranijo. Sredstvo z odprtim ticketom se na kartici sam označi kot V servisu."
            checked={active}
            onCheckedChange={setActive}
          />
          {isEdit && onRequestDelete && (
            <DangerZone
              label="Izbriši to sredstvo"
              description="Dokončno ga odstrani iz registra. Njegovi ticketi se ohranijo, a brez sredstva."
              actionLabel="Izbriši"
              onAction={onRequestDelete}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button onClick={submit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMachineDialog({
  open,
  onOpenChange,
  machine,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  machine: Machine | null;
  onConfirm: () => void;
}) {
  const count = machine?._count?.tickets ?? 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 shrink-0" />
            Brisanje sredstva
          </DialogTitle>
          <DialogDescription>
            To odstrani{" "}
            <span className="font-semibold text-primary">
              {machine?.brand} {machine?.model}
            </span>{" "}
            iz registra.
            {count > 0
              ? ` Njegovih ${count} ${ticketCountLabel(count)} se ohrani, le da ne kažejo
                 več na sredstvo.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Izbriši sredstvo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
