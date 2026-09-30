"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Mail, Pencil, Plus, UserRound, Network, ShieldUser, CircleDot, KeyRound, Phone, Copy } from "@/components/icons";
import { RowContextMenu, copyValue } from "@/components/row-context-menu";
import { ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "@/components/ui/context-menu";
import { ActivityBadge } from "@/components/badges";
import { PageDate } from "@/components/page-date";
import { DepartmentBadge } from "@/components/department-badge";
import { FlashInput } from "@/components/ui/flash-input";
import { PropertyInput, PropertyList, PropertyRow } from "@/components/ui/property-list";
import { createUserSchema, updateUserSchema, USER_IMAGE } from "@servis-track/shared";
import { apiPost, apiPatch, apiUpload, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { paramOr, useFiltersInUrl } from "@/lib/url-filters";
import { useAuth } from "@/lib/auth";
import { useIsDesktop } from "@/lib/use-media";
import { useListView } from "@/lib/view-preference";
import { validateForm, type FieldErrors } from "@/lib/form";
import type { AppUser, Department } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ToggleRow } from "@/components/dialog-rows";
import { CopyableValue } from "@/components/copyable";
import { PhoneNumber } from "@/components/phone-number";
import { UserAvatar } from "@/components/user-avatar";
import { onTintCursorMoveRow } from "@/components/hover-tint";
import { Loader } from "@/components/loader";
import { UserCard, UserCardSkeleton } from "@/components/user-card";
import { ImageField, checkImageFile } from "@/components/image-field";
import { Pagination, useClientPage, PageStep } from "@/components/ui/pagination";
import { useDevicePrefs } from "@/lib/device-prefs";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search-input";
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

const ROLE_OPTIONS = [
  { value: "TECHNICIAN", label: "Delavec" },
  { value: "ADMIN", label: "Administrator" },
];

const NONE = "NONE";

const ALL = "ALL";

const ROLE_FILTER_OPTIONS: ComboboxOption[] = [
  { value: ALL, label: "Vse vloge" },
  ...ROLE_OPTIONS,
];

const STATUS_FILTER_OPTIONS: ComboboxOption[] = [
  { value: ALL, label: "Vsi statusi" },
  { value: "active", label: "Aktivni" },
  { value: "inactive", label: "Deaktivirani" },
];

const CARD_PAGE_SIZE = 40;

const COLUMNS = 8;

const validateUserImageFile = (file: File) =>
  checkImageFile(file, {
    mimeTypes: USER_IMAGE.mimeTypes,
    maxBytes: USER_IMAGE.maxBytes,
    typeMessage: "Dovoljene so slike PNG, WebP in JPEG.",
    dimensions: ({ width, height }) => {
      if (
        width < USER_IMAGE.minSize ||
        height < USER_IMAGE.minSize ||
        width > USER_IMAGE.maxSize ||
        height > USER_IMAGE.maxSize
      ) {
        return `Stranica slike mora biti med ${USER_IMAGE.minSize} in ${USER_IMAGE.maxSize} slikovnimi pikami (naložena: ${width} × ${height}).`;
      }
      if (Math.abs(width - height) / Math.max(width, height) > USER_IMAGE.aspectTolerance) {
        return `Slika mora biti kvadratna (naložena: ${width} × ${height}).`;
      }
      return null;
    },
  });

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersPageInner />
    </Suspense>
  );
}

function UsersPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const { data, loading, error, refetch } = useApi<AppUser[]>("/users");
  const { data: departments } = useApi<Department[]>("/departments");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [q, setQ] = useState(() => paramOr(params, "q", ""));
  const [filtersOpen, setFiltersOpen] = useState(() =>
    ["departmentId", "role", "status"].some((k) => params.get(k)),
  );
  const [dept, setDept] = useState(() => paramOr(params, "departmentId", ALL));
  const [role, setRole] = useState(() =>
    paramOr(params, "role", ALL, ROLE_FILTER_OPTIONS.map((o) => o.value)),
  );
  const [status, setStatus] = useState(() =>
    paramOr(params, "status", ALL, STATUS_FILTER_OPTIONS.map((o) => o.value)),
  );
  useFiltersInUrl(
    { q: q.trim(), departmentId: dept, role, status },
    { q: "", departmentId: ALL, role: ALL, status: ALL },
  );
  const { view } = useListView("users");
  const isDesktop = useIsDesktop(true);
  const showCards = !isDesktop || view === "CARDS";

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/zahtevki");
  }, [authLoading, isAdmin, router]);

  const needle = q.trim().toLowerCase();
  const visible = (data ?? []).filter((u) => {
    if (dept !== ALL && u.departmentId !== dept) return false;
    if (role !== ALL && u.role !== role) return false;
    if (status !== ALL && u.active !== (status === "active")) return false;
    return needle
      ? `${u.name ?? ""} ${u.username} ${u.phone ?? ""} ${u.email ?? ""} ${u.department?.name ?? ""}`
          .toLowerCase()
          .includes(needle)
      : true;
  });

  const filtersActive = dept !== ALL || role !== ALL || status !== ALL || q !== "";

  const activeFilterCount = [dept, role, status].filter((v) => v !== ALL).length;

  function clearFilters() {
    setDept(ALL);
    setRole(ALL);
    setStatus(ALL);
    setQ("");
  }

  const departmentFilterOptions: ComboboxOption[] = [
    { value: ALL, label: "Vsi oddelki" },
    ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];

  const FILTER_WIDTH = "w-[13.75rem]";

  const filterControls = (
    <>
      <Combobox
        value={dept}
        onChange={setDept}
        options={departmentFilterOptions}
        icon={Network}
        searchable
        searchPlaceholder="Iskanje oddelkov…"
        listClassName="max-h-[22rem]"
        className={FILTER_WIDTH}
      />
      <Combobox
        value={role}
        onChange={setRole}
        options={ROLE_FILTER_OPTIONS}
        icon={ShieldUser}
        className={FILTER_WIDTH}
      />
      <Combobox
        value={status}
        onChange={setStatus}
        options={STATUS_FILTER_OPTIONS}
        icon={CircleDot}
        className={FILTER_WIDTH}
      />
    </>
  );

  const { pageSize: tablePageSize } = useDevicePrefs();
  const pageSize = showCards ? CARD_PAGE_SIZE : tablePageSize;
  const { page, setPage, pageCount, paged } = useClientPage(visible, pageSize);

  useEffect(() => {
    setPage(0);
  }, [q, dept, role, status]);

  const activeFilterLabels = [
    dept !== ALL && optionLabel(departmentFilterOptions, dept),
    role !== ALL && optionLabel(ROLE_FILTER_OPTIONS, role),
    status !== ALL && optionLabel(STATUS_FILTER_OPTIONS, status),
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
              <Plus className="size-4" strokeWidth={2.1} /> Dodaj uporabnika
            </Button>
          }
        >
          <SearchInput
            aria-label="Iskanje uporabnikov"
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
                  controls="user-filters"
                />
              </>
            }
          />
        </SearchRow>

        <FilterRevealRow
          id="user-filters"
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
            title="Filtri uporabnikov"
            activeCount={activeFilterCount}
            onClear={clearFilters}
          >
            {filterControls}
          </MobileFilters>
          <BarCircle label="Dodaj uporabnika" variant="primary" onClick={() => setAddOpen(true)}>
            <Plus strokeWidth={2.1} />
          </BarCircle>
        </MobileBarActions>
      </div>

      {showCards && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {loading && Array.from({ length: 6 }).map((_, i) => <UserCardSkeleton key={i} />)}

          {!loading &&
            !error &&
            paged.map((u) => (
              <div key={u.id} className="h-full">
                <UserCard user={u} canManage={isAdmin} onEdit={() => setEditing(u)} />
              </div>
            ))}
        </div>
      )}

      {showCards && !loading && error && (
        <p className="py-10 text-center text-sm text-destructive">{error}</p>
      )}
      {showCards && !loading && !error && visible.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {data && data.length > 0 ? "Iskanju ne ustreza nihče." : "Delavcev še ni."}
        </p>
      )}

      {!showCards && (
      <div className={TABLE_FRAME}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <span className="sr-only">Slika</span>
              </TableHead>
              <TableHead icon={UserRound}>Ime</TableHead>
              <TableHead icon={KeyRound}>Uporabniško ime</TableHead>
              <TableHead icon={Mail}>E-pošta</TableHead>
              <TableHead icon={Phone}>Telefon</TableHead>
              <TableHead icon={Network}>Oddelek</TableHead>
              <TableHead icon={ShieldUser}>Vloga</TableHead>
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
                <TableCell colSpan={COLUMNS} className="py-8 text-center text-sm text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && visible.length === 0 && (
              <TableEmpty colSpan={COLUMNS}>
                {data && data.length > 0 ? "Iskanju ne ustreza nihče" : "Delavcev še ni."}
              </TableEmpty>
            )}
            {!loading &&
              !error &&
              paged.map((u, i) => (
                <RowContextMenu
                  key={u.id}
                  items={
                    <>
                      <ContextMenuLabel>{u.name ?? u.username}</ContextMenuLabel>
                      {u.email && (
                        <>
                          <ContextMenuItem onSelect={() => (window.location.href = `mailto:${u.email}`)}>
                            <Mail /> Pošlji e-pošto
                          </ContextMenuItem>
                          <ContextMenuItem onSelect={() => void copyValue(u.email!, "E-pošta kopirana")}>
                            <Copy /> Kopiraj e-pošto
                          </ContextMenuItem>
                        </>
                      )}
                      {u.phone && (
                        <>
                          <ContextMenuItem onSelect={() => (window.location.href = `tel:${u.phone!.replace(/\s/g, "")}`)}>
                            <Phone /> Pokliči
                          </ContextMenuItem>
                          <ContextMenuItem onSelect={() => void copyValue(u.phone!, "Telefon kopiran")}>
                            <Copy /> Kopiraj telefon
                          </ContextMenuItem>
                        </>
                      )}
                      {(u.email || u.phone) && <ContextMenuSeparator />}
                      <ContextMenuItem onSelect={() => setEditing(u)}>
                        <Pencil /> Uredi
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
                  <TableCell>
                    <UserAvatar user={u} className="size-7" iconClassName="size-4" />
                  </TableCell>
                  <TableCell  >{u.name ?? <EmptyCell />}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>
                    <CopyableValue
                      value={u.email}
                      icon={Mail}
                      showIcon={false}
                      copiedLabel="E-pošta kopirana"
                      toastId="copy-email"
                    />
                  </TableCell>
                  <TableCell>
                    <PhoneNumber phone={u.phone} icon={false} />
                  </TableCell>
                  <TableCell>
                    {u.department ? <DepartmentBadge department={u.department} /> : <EmptyCell />}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.role === "ADMIN" ? "default" : "outline"}
                      className="rounded-full"
                    >
                      {u.role === "ADMIN" ? "Administrator" : "Delavec"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ActivityBadge active={u.active} labels={["Aktiven", "Deaktiviran"]} />
                  </TableCell>
                </TableRow>
                </RowContextMenu>
              ))}
          </TableBody>
        </Table>
      </div>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        departments={departments}
        onDone={() => {
          setAddOpen(false);
          void refetch();
        }}
      />
      <EditUserDialog
        user={editing}
        departments={departments}
        onOpenChange={(v) => !v && setEditing(null)}
        onDone={() => {
          setEditing(null);
          void refetch();
        }}
        onImageChanged={() => void refetch()}
      />
    </div>
  );
}

function departmentOptions(departments: Department[] | null): ComboboxOption[] {
  return [
    { value: NONE, label: "Brez oddelka" },
    ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];
}

function AddUserDialog({
  open,
  onOpenChange,
  departments,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departments: Department[] | null;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState(NONE);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("TECHNICIAN");
  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setUsername("");
      setPhone("");
      setEmail("");
      setDepartmentId(NONE);
      setPassword("");
      setRole("TECHNICIAN");
      setImage(null);
      setErrors({});
      setBusy(false);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = validateForm(createUserSchema, {
      name: name.trim(),
      username: username.trim(),
      phone: phone.trim() ? phone.trim() : undefined,
      email: email.trim() ? email.trim() : undefined,
      departmentId: departmentId === NONE ? undefined : departmentId,
      password,
      role,
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const created = await apiPost<AppUser>("/users", parsed.data);
      if (image) {
        try {
          await apiUpload(`/users/${created.id}/image`, image);
        } catch {
          toast.error("Delavec je dodan, slike ni bilo mogoče naložiti. Dodajte jo prek urejanja.");
          onDone();
          return;
        }
      }
      toast.success("Delavec dodan");
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delavca ni bilo mogoče dodati");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[26rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-5 shrink-0" />
            Dodaj uporabnika
          </DialogTitle>
          <DialogDescription className="sr-only">
            Prijavlja se z uporabniškim imenom; telefon je način, kako ga dosežete glede
            ticketa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <FlashInput
              aria-label="Ime in priimek"
              placeholder="Ime in priimek"
              value={name}
              aria-invalid={!!errors.name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-semibold"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <PropertyList>
            <PropertyRow label="Uporabniško ime" error={errors.username}>
              <PropertyInput
                aria-label="Uporabniško ime"
                placeholder="ime.priimek"
                value={username}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!errors.username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </PropertyRow>
            <PropertyRow label="Geslo" error={errors.password}>
              <PropertyInput
                type="password"
                aria-label="Geslo"
                placeholder="Vsaj 8 znakov"
                value={password}
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </PropertyRow>
            <PropertyRow label="Vloga">
              <Combobox variant="inline" value={role} onChange={setRole} options={ROLE_OPTIONS} />
            </PropertyRow>
            <PropertyRow label="Oddelek">
              <Combobox
                variant="inline"
                emptyValue={NONE}
                value={departmentId}
                onChange={setDepartmentId}
                options={departmentOptions(departments)}
                icon={Network}
                searchable
                searchPlaceholder="Iskanje oddelkov…"
                listClassName="max-h-60"
              />
            </PropertyRow>
            <PropertyRow label="E-pošta" error={errors.email}>
              <PropertyInput
                type="email"
                aria-label="E-pošta"
                placeholder="ime.priimek@podjetje.si"
                value={email}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!errors.email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </PropertyRow>
            <PropertyRow label="Telefon" error={errors.phone}>
              <PropertyInput
                aria-label="Telefon"
                placeholder="+386 41 200 201"
                value={phone}
                aria-invalid={!!errors.phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </PropertyRow>
          </PropertyList>
          <Separator />
          <ImageField
            label="Slika uporabnika"
            resource="users"
            id={null}
            initialHasImage={false}
            accept={USER_IMAGE.mimeTypes.join(",")}
            hint={`PNG, WebP ali JPEG | kvadratna, ${USER_IMAGE.minSize}–${USER_IMAGE.maxSize} pikselov`}
            frameClassName="size-20 rounded-full"
            fit="cover"
            placeholder={<UserRound className="size-6 text-muted-foreground" />}
            check={validateUserImageFile}
            onPick={setImage}
            onChanged={() => {}}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Prekliči
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Dodajanje…" : "Dodaj uporabnika"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  departments,
  onOpenChange,
  onDone,
  onImageChanged,
}: {
  user: AppUser | null;
  departments: Department[] | null;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
  onImageChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState(NONE);
  const [role, setRole] = useState("TECHNICIAN");
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
      setEmail(user.email ?? "");
      setDepartmentId(user.departmentId ?? NONE);
      setRole(user.role);
      setActive(user.active);
      setPassword("");
      setErrors({});
      setBusy(false);
    }
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const patch = {
      name: name.trim(),
      phone: phone.trim() ? phone.trim() : null,
      email: email.trim() ? email.trim() : null,
      departmentId: departmentId === NONE ? null : departmentId,
      role,
      active,
      ...(password ? { password } : {}),
    };
    const parsed = validateForm(updateUserSchema, patch);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await apiPatch(`/users/${user.id}`, patch);
      toast.success("Delavec posodobljen");
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delavca ni bilo mogoče posodobiti");
      setBusy(false);
    }
  }

  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[26rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-5 shrink-0" />
            Uredi uporabnika
          </DialogTitle>
          <DialogDescription className="sr-only">
            Uporabniško ime ostane nespremenjeno, saj se z njim prijavlja. Če polje za geslo
            pustite prazno, se ohrani obstoječe.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <FlashInput
              aria-label="Ime in priimek"
              placeholder="Ime in priimek"
              value={name}
              aria-invalid={!!errors.name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-semibold"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <PropertyList>
            <PropertyRow label="Vloga">
              <Combobox variant="inline" value={role} onChange={setRole} options={ROLE_OPTIONS} />
            </PropertyRow>
            <PropertyRow label="Oddelek">
              <Combobox
                variant="inline"
                emptyValue={NONE}
                value={departmentId}
                onChange={setDepartmentId}
                options={departmentOptions(departments)}
                icon={Network}
                searchable
                searchPlaceholder="Iskanje oddelkov…"
                listClassName="max-h-60"
              />
            </PropertyRow>
            <PropertyRow label="E-pošta" error={errors.email}>
              <PropertyInput
                type="email"
                aria-label="E-pošta"
                placeholder="ime.priimek@podjetje.si"
                value={email}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!errors.email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </PropertyRow>
            <PropertyRow label="Telefon" error={errors.phone}>
              <PropertyInput
                aria-label="Telefon"
                placeholder="+386 41 200 201"
                value={phone}
                aria-invalid={!!errors.phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </PropertyRow>
            <PropertyRow label="Novo geslo" error={errors.password}>
              <PropertyInput
                type="password"
                aria-label="Novo geslo"
                placeholder="Pustite prazno za obstoječe"
                value={password}
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </PropertyRow>
          </PropertyList>
          <Separator />
          <ImageField
            key={user?.id ?? "none"}
            label="Slika uporabnika"
            resource="users"
            id={user?.id ?? null}
            initialHasImage={user?.hasImage ?? false}
            accept={USER_IMAGE.mimeTypes.join(",")}
            hint={`PNG, WebP ali JPEG | kvadratna, ${USER_IMAGE.minSize}–${USER_IMAGE.maxSize} pikselov`}
            frameClassName="size-20 rounded-full"
            fit="cover"
            placeholder={<UserRound className="size-6 text-muted-foreground" />}
            check={validateUserImageFile}
            onPick={() => {}}
            onChanged={onImageChanged}
          />
          <ToggleRow
            label="Aktiven"
            description="Deaktivirani delavci obdržijo svoje tickete, a se ne morejo prijaviti."
            checked={active}
            onCheckedChange={setActive}
          />
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
              ) : (
                "Shrani spremembe"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
