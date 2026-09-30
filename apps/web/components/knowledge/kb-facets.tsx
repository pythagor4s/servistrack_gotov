"use client";

import { FadeText } from "@/components/ui/fade-text";
import type { ReactNode } from "react";

import { TYPE_META } from "@/components/badges";
import { Layers, LayoutList, Network, NotebookPen, Pin, Shapes, Tags, X, type IconComponent } from "@/components/icons";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { POPOVER_LABEL } from "@/components/ui/popover";
import { onTintCursorLeave, onTintCursorMoveCentered, onTintCursorMovePlate } from "@/components/hover-tint";
import { FAULT_ICON } from "@/lib/fault-categories";
import { machineOptions } from "@/lib/machines";
import type { TicketType } from "@servis-track/shared";
import type { Department, FaultCategory, KbFacets, Machine } from "@/lib/types";
import { cn } from "@/lib/utils";

import { type KbFilters, nf } from "./kb-state";

export function KbFacets({
  facets,
  categories,
  machines,
  departments,
  filters,
  onChange,
}: {
  facets: KbFacets | null;
  categories: FaultCategory[];
  machines: Machine[];
  departments: Department[];
  filters: KbFilters;
  onChange: (patch: Partial<KbFilters>) => void;
}) {
  const count = (list: KbFacets[keyof Omit<KbFacets, "pinned">] | undefined, value: string) =>
    list?.find((b) => b.value === value)?.count ?? 0;
  const categoryTotal = facets?.category.reduce((s, b) => s + b.count, 0) ?? 0;
  const sourceTotal = facets?.source.reduce((s, b) => s + b.count, 0) ?? 0;
  const typeTotal = facets?.type.reduce((s, b) => s + b.count, 0) ?? 0;
  const uncategorized = count(facets?.category, "none");

  const machineCounts = new Map(facets?.machine.map((b) => [b.value, b.count]));
  const machineChoices = machineOptions(
    machines.filter((m) => machineCounts.has(m.id) || m.id === filters.machineId),
    { value: "", label: "Vsa sredstva" },
  ).map((o) => (o.value ? { ...o, label: `${o.label} · ${machineCounts.get(o.value) ?? 0}` } : o));
  const departmentCounts = new Map(facets?.department.map((b) => [b.value, b.count]));
  const departmentChoices: ComboboxOption[] = [
    { value: "", label: "Vsi oddelki" },
    ...departments
      .filter((d) => departmentCounts.has(d.id) || d.id === filters.departmentId)
      .map((d) => ({ value: d.id, label: `${d.name} · ${departmentCounts.get(d.id) ?? 0}` })),
  ];

  return (
    <nav aria-label="Filtri baze znanja" className="space-y-5 pb-4">
      <FacetGroup label="Kategorije napak">
        <FacetRow
          icon={Layers}
          label="Vse kategorije"
          count={categoryTotal}
          active={!filters.categoryId}
          onClick={() => onChange({ categoryId: "" })}
        />
        {categories.map((c) => (
          <FacetRow
            key={c.id}
            icon={FAULT_ICON[c.icon] ?? Shapes}
            label={c.name}
            count={count(facets?.category, c.id)}
            active={filters.categoryId === c.id}
            onClick={() => onChange({ categoryId: filters.categoryId === c.id ? "" : c.id })}
          />
        ))}
        {(uncategorized > 0 || filters.categoryId === "none") && (
          <FacetRow
            icon={Shapes}
            label="Brez kategorije"
            count={uncategorized}
            active={filters.categoryId === "none"}
            onClick={() => onChange({ categoryId: filters.categoryId === "none" ? "" : "none" })}
          />
        )}
      </FacetGroup>

      <FacetGroup label="Izvor">
        <FacetRow
          icon={Layers}
          label="Vsi zapisi"
          count={sourceTotal}
          active={!filters.source && !filters.pinned}
          onClick={() => onChange({ source: "", pinned: "" })}
        />
        <FacetRow
          icon={Tags}
          label="Iz rešenih ticketov"
          count={count(facets?.source, "ticket")}
          active={filters.source === "ticket"}
          onClick={() => onChange({ source: filters.source === "ticket" ? "" : "ticket" })}
        />
        <FacetRow
          icon={NotebookPen}
          label="Ročni vnosi"
          count={count(facets?.source, "manual")}
          active={filters.source === "manual"}
          onClick={() => onChange({ source: filters.source === "manual" ? "" : "manual" })}
        />
        <FacetRow
          icon={Pin}
          label="Pripeti"
          count={facets?.pinned ?? 0}
          active={!!filters.pinned}
          onClick={() => onChange({ pinned: filters.pinned ? "" : "1" })}
        />
      </FacetGroup>

      <FacetGroup label="Vrsta">
        <FacetRow
          icon={Layers}
          label="Vse vrste"
          count={typeTotal}
          active={!filters.type}
          onClick={() => onChange({ type: "" })}
        />
        {(Object.keys(TYPE_META) as TicketType[]).map((t) => (
          <FacetRow
            key={t}
            icon={TYPE_META[t].icon}
            label={TYPE_META[t].label}
            count={count(facets?.type, t)}
            active={filters.type === t}
            onClick={() => onChange({ type: filters.type === t ? "" : t })}
          />
        ))}
      </FacetGroup>

      <FacetGroup label="Sredstvo in oddelek">
        <div className="space-y-2 px-0.5 pt-0.5">
          <Combobox
            value={filters.machineId}
            onChange={(v) => onChange({ machineId: v })}
            options={machineChoices}
            icon={LayoutList}
            searchable
            searchPlaceholder="Iskanje po znamki, modelu…"
            listClassName="max-h-[min(30rem,60vh)]"
            className="w-full"
          />
          <Combobox
            value={filters.departmentId}
            onChange={(v) => onChange({ departmentId: v })}
            options={departmentChoices}
            icon={Network}
            searchable
            searchPlaceholder="Iskanje oddelkov…"
            className="w-full"
          />
        </div>
      </FacetGroup>

      {facets && facets.tag.length > 0 && (
        <FacetGroup label="Pogoste oznake">
          <div className="flex flex-wrap gap-1.5 px-0.5 pt-1">
            {facets.tag.slice(0, 18).map((b) => (
              <TagChip
                key={b.value}
                label={b.value}
                count={b.count}
                active={filters.tag === b.value}
                onClick={() => onChange({ tag: filters.tag === b.value ? "" : b.value })}
              />
            ))}
          </div>
        </FacetGroup>
      )}
    </nav>
  );
}

function FacetGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h3 className={cn(POPOVER_LABEL, "px-2")}>{label}</h3>
      <div className="flex flex-col gap-px">{children}</div>
    </section>
  );
}

function FacetRow({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: IconComponent;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={count === 0 && !active}
      data-tint=""
      onPointerMove={onTintCursorMovePlate}
      onPointerLeave={onTintCursorLeave}
      className={cn(
        "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors",
        active ? "font-medium text-foreground" : "text-nav-foreground hover:text-foreground",
        count === 0 && !active && "opacity-45",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <FadeText className="flex-1">{label}</FadeText>
      <span className="shrink-0 text-xs tabular-nums">{nf.format(count)}</span>
    </button>
  );
}

export function TagChip({
  label,
  count,
  active,
  onClick,
  onRemove,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  const body = (
    <>
      <span className="text-nav-foreground">#</span>
      <FadeText>{label}</FadeText>
      {count !== undefined && <span className="text-nav-foreground tabular-nums">{count}</span>}
      {onRemove && <X className="size-3 text-nav-foreground" />}
    </>
  );
  const classes = cn(
    "inline-flex h-6 max-w-full items-center gap-1 rounded-full border bg-field-tinted px-2 text-xs transition-colors",
    active ? "border-foreground text-foreground" : "text-foreground hover:border-border-row-hover",
  );
  if (!onClick && !onRemove) return <span className={classes}>{body}</span>;
  return (
    <button
      type="button"
      aria-pressed={onClick ? !!active : undefined}
      aria-label={onRemove ? `Odstrani oznako ${label}` : undefined}
      onClick={onRemove ?? onClick}
      data-tint="center"
      onPointerMove={onTintCursorMoveCentered}
      onPointerLeave={onTintCursorLeave}
      className={classes}
    >
      {body}
    </button>
  );
}
