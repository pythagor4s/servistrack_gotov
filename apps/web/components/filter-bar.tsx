"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal, X } from "@/components/icons";
import { AnimatedSliders } from "@/components/animated-sliders";

import { Button } from "@/components/ui/button";
import type { ComboboxOption } from "@/components/ui/combobox";
import { IconAction } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ClearFiltersButton({
  active,
  onClear,
  persistent = false,
  compact = false,
  className,
}: {
  active: boolean;
  onClear: () => void;
  persistent?: boolean;
  compact?: boolean;
  className?: string;
}) {
  if (!active && !persistent) return null;
  const label = active ? "Počisti filtre" : "Ni aktivnih filtrov";

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClear}
      disabled={!active}
      aria-label={compact ? label : undefined}
      className={cn("shrink-0", className)}
    >
      {active ? <X className="size-4" /> : <SlidersHorizontal className="size-4" />}
      {compact ? <span className="max-xl:hidden">{label}</span> : label}
    </Button>
  );
}

export function SearchRow({
  leading,
  filtersActive,
  onClearFilters,
  action,
  multiline = false,
  children,
}: {
  action?: ReactNode;
  multiline?: boolean;
  children: ReactNode;
} & (
  | { leading: ReactNode; filtersActive?: never; onClearFilters?: never }
  | { leading?: never; filtersActive: boolean; onClearFilters: () => void }
)) {
  const left = leading ?? (
    <ClearFiltersButton
      active={filtersActive ?? false}
      onClear={onClearFilters ?? (() => {})}
      persistent
    />
  );

  return (
    <div
      className={cn(
        "mb-4 grid grid-cols-1 items-start gap-3",
        "lg:grid-cols-[1fr_minmax(0,28rem)_1fr]",
        !multiline && "items-center",
      )}
    >
      <Side main={left} mirror={action} />
      <div className="w-full sm:w-112 sm:justify-self-center lg:w-full">{children}</div>
      <Side main={action} mirror={left} end />
    </div>
  );
}

function Side({ main, mirror, end = false }: { main: ReactNode; mirror: ReactNode; end?: boolean }) {
  return (
    <div
      className={cn(
        "hidden lg:grid [&>*]:[grid-area:1/1]",
        end ? "justify-items-end" : "justify-items-start",
      )}
    >
      <div aria-hidden inert className="invisible flex items-center gap-2">
        {mirror}
      </div>
      <div className="flex items-center gap-2">{main}</div>
    </div>
  );
}

export function FiltersToggle({
  open,
  onToggle,
  activeCount,
  controls,
  icon = false,
}: {
  open: boolean;
  onToggle: () => void;
  activeCount: number;
  controls: string;
  icon?: boolean;
}) {
  if (icon) {
    const label = activeCount > 0 ? `Filtri (${activeCount} aktivnih)` : "Filtri";
    return (
      <IconAction label={label}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-expanded={open}
          aria-controls={controls}
          onClick={onToggle}
          className="relative size-7 shrink-0"
        >
          <AnimatedSliders
            on={open}
            className={cn(
              "size-4 transition-colors",
              open || activeCount > 0 ? "text-primary" : "text-muted-foreground",
            )}
          />
          {activeCount > 0 && (
            <span
              aria-hidden
              className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary"
            />
          )}
        </Button>
      </IconAction>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className="shrink-0"
    >
      <AnimatedSliders on={open} className="size-4" />
      Filtri
      {activeCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] leading-none font-medium text-primary-foreground tabular-nums">
          {activeCount}
        </span>
      )}
      <ChevronDown
        className={cn(
          "size-4 transition-transform duration-300 ease-out motion-reduce:transition-none",
          open && "rotate-180",
        )}
      />
    </Button>
  );
}

const SWAP_DELAY_MS = 90;

const SUMMARY_ENTER =
  "animate-fade-in [&_p]:animate-filter-in [&_p]:[animation-delay:90ms] " +
  "[&_button:first-of-type]:animate-arrow-in-left [&_button:first-of-type]:[animation-delay:90ms] " +
  "[&_button:last-of-type]:animate-arrow-in-right [&_button:last-of-type]:[animation-delay:90ms] " +
  "motion-reduce:[&_*]:animate-none";
const SUMMARY_EXIT =
  "animate-fade-out [&_p]:animate-filter-out " +
  "[&_button:first-of-type]:animate-arrow-out-left [&_button:last-of-type]:animate-arrow-out-right " +
  "motion-reduce:[&_*]:animate-none";

function useToggled(show: boolean): boolean {
  const [prev, setPrev] = useState(show);
  const [toggled, setToggled] = useState(false);
  if (show !== prev) {
    setPrev(show);
    setToggled(true);
  }
  return toggled;
}

function Reveal({
  show,
  delay = 0,
  className,
  enter = "animate-filter-in",
  exit = "animate-filter-out",
  children,
}: {
  show: boolean;
  delay?: number;
  className?: string;
  enter?: string;
  exit?: string;
  children: ReactNode;
}) {
  const toggled = useToggled(show);
  return (
    <div
      inert={!show}
      className={cn(
        !toggled && !show && "opacity-0",
        toggled && show && enter,
        toggled && !show && cn(exit, "motion-reduce:opacity-0"),
        "motion-reduce:animate-none",
        className,
      )}
      style={toggled && show && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function FilterRevealRow({
  id,
  open,
  summary,
  start,
  end,
  summaryAlign = "start",
  sidesWithFilters = false,
  children,
}: {
  id: string;
  open: boolean;
  summary: ReactNode;
  start?: ReactNode;
  end?: ReactNode;
  summaryAlign?: "start" | "center";
  sidesWithFilters?: boolean;
  children: ReactNode;
}) {
  const toggled = useToggled(open);
  const centered = summaryAlign === "center";

  const filters = (
    <div
      id={id}
      inert={!open}
      className={cn(
        "flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2",
        !toggled && !open && "[&>*]:opacity-0",
        toggled &&
          open &&
          "[&>*]:animate-filter-in [&>*:nth-child(1)]:[animation-delay:90ms] [&>*:nth-child(2)]:[animation-delay:130ms] [&>*:nth-child(3)]:[animation-delay:170ms] [&>*:nth-child(4)]:[animation-delay:210ms] [&>*:nth-child(5)]:[animation-delay:250ms]",
        toggled && !open && "[&>*]:animate-filter-out motion-reduce:[&>*]:opacity-0",
        "motion-reduce:[&>*]:animate-none",
      )}
    >
      {children}
    </div>
  );
  const staged =
    "[&_svg]:animate-fade-in [&_button]:animate-button-body-in [&_button]:[animation-delay:160ms] " +
    "motion-reduce:[&_*]:animate-none";
  const withReveal = (node: ReactNode, side: "start" | "end") =>
    sidesWithFilters ? (
      <Reveal
        show={open}
        enter={cn(side === "start" ? "animate-side-in-start" : "animate-side-in-end", staged)}
        exit={side === "start" ? "animate-side-out-start" : "animate-side-out-end"}
      >
        {node}
      </Reveal>
    ) : (
      node
    );
  const startGroup = (className?: string) =>
    start ? <div className={cn("flex shrink-0 items-center gap-2", className)}>{start}</div> : null;
  const endGroup = (className?: string) => (
    <div className={cn("flex shrink-0 items-center gap-3", className)}>{end}</div>
  );
  const ghost = (node: ReactNode) => (
    <div aria-hidden inert className="invisible">
      {node}
    </div>
  );
  const sideGhost = (
    <div aria-hidden inert className="invisible grid [&>*]:[grid-area:1/1]">
      {start && startGroup()}
      {endGroup()}
    </div>
  );

  if (centered) {
    return (
      <div className="hidden grid-cols-[1fr_minmax(0,auto)_1fr] items-start gap-3 lg:grid">
        <div className="col-span-3 col-start-1 row-start-1 flex min-w-0 items-start gap-3">
          {sideGhost}
          {filters}
          {sideGhost}
        </div>
        <Reveal
          show={!open}
          delay={SWAP_DELAY_MS}
          enter={SUMMARY_ENTER}
          exit={SUMMARY_EXIT}
          className="col-start-2 row-start-1 flex h-9 min-w-0 items-center justify-center text-center"
        >
          {summary}
        </Reveal>
        <div className="pointer-events-none col-start-1 row-start-1 grid justify-items-start [&>*]:[grid-area:1/1]">
          {ghost(endGroup())}
          {withReveal(startGroup("pointer-events-auto"), "start")}
        </div>
        <div className="pointer-events-none col-start-3 row-start-1 grid justify-items-end [&>*]:[grid-area:1/1]">
          {start && ghost(startGroup())}
          {withReveal(endGroup("pointer-events-auto"), "end")}
        </div>
      </div>
    );
  }

  return (
    <div className="hidden items-start justify-between gap-3 lg:flex">
      {startGroup()}
      <div className="grid min-w-0 flex-1 [&>*]:[grid-area:1/1]">
        {filters}
        <Reveal show={!open} delay={SWAP_DELAY_MS} className="flex h-9 min-w-0 items-center">
          {summary}
        </Reveal>
      </div>
      {endGroup()}
    </div>
  );
}

export function FiltersClearInField({ active, onClear }: { active: boolean; onClear: () => void }) {
  const [mounted, setMounted] = useState(active);
  if (active && !mounted) setMounted(true);

  useEffect(() => {
    if (active || !mounted) return;
    const id = window.setTimeout(() => setMounted(false), 420);
    return () => window.clearTimeout(id);
  }, [active, mounted]);

  if (!mounted) return null;
  return (
    <IconAction label="Počisti filtre">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Počisti filtre"
        disabled={!active}
        onClick={onClear}
        className={cn(
          "size-7 shrink-0 overflow-hidden disabled:opacity-100 motion-reduce:animate-none",
          active ? "animate-field-in" : "animate-field-out",
        )}
      >
        <X className="size-4" />
      </Button>
    </IconAction>
  );
}

export function optionLabel(options: ComboboxOption[], value: string): string | undefined {
  return options.find((o) => o.value === value)?.label;
}

export function ResultsSummary({
  page,
  pageSize,
  total,
  filters,
}: {
  page: number;
  pageSize: number;
  total: number;
  filters: string[];
}) {
  const num = "font-medium text-foreground tabular-nums";
  return (
    <p className="truncate text-[0.9375rem] text-muted-foreground">
      {total === 0 ? (
        "Ni zadetkov"
      ) : (
        <>
          Prikazano{" "}
          <span className={num}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)}
          </span>{" "}
          od skupno <span className={num}>{total}</span>
        </>
      )}
      {filters.length > 0 && (
        <>
          <span className="text-foreground-faint"> · </span>
          Filtri: <span className="text-foreground">{filters.join(", ")}</span>
        </>
      )}
    </p>
  );
}
