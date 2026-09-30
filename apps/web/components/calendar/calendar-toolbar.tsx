"use client";

import { ChevronLeft, Plus, ChevronRight, Shapes } from "@/components/icons";

import { cn } from "@/lib/utils";
import type { CalendarView } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { IconAction } from "@/components/ui/tooltip";
import { PageDate } from "@/components/page-date";
import { SEGMENT_TRACK, segmentPosition } from "@/components/view-toggle";

const VIEW_LABELS: Record<CalendarView, string> = {
  month: "Mesec",
  week: "Teden",
  day: "Dan",
  list: "Seznam",
};

const STEP_LABELS: Record<CalendarView, [string, string]> = {
  month: ["Prejšnji mesec", "Naslednji mesec"],
  week: ["Prejšnji teden", "Naslednji teden"],
  day: ["Prejšnji dan", "Naslednji dan"],
  list: ["Prejšnjih 31 dni", "Naslednjih 31 dni"],
};

export function CalendarToolbar({
  view,
  onViewChange,
  label,
  onToday,
  onStep,
  categoryOptions,
  categoryFilter,
  onCategoryFilter,
  onCreate,
}: {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  label: string;
  onToday: () => void;
  onStep: (dir: 1 | -1) => void;
  categoryOptions: ComboboxOption[];
  categoryFilter: string;
  onCategoryFilter: (value: string) => void;
  onCreate: () => void;
}) {
  const [prevLabel, nextLabel] = STEP_LABELS[view];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageDate as="h1">{label}</PageDate>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <IconAction label={prevLabel}>
              <Button variant="outline" size="icon" aria-label={prevLabel} className="bg-header-button" onClick={() => onStep(-1)}>
                <ChevronLeft className="size-4" />
              </Button>
            </IconAction>
            <IconAction label={nextLabel}>
              <Button variant="outline" size="icon" aria-label={nextLabel} className="bg-header-button" onClick={() => onStep(1)}>
                <ChevronRight className="size-4" />
              </Button>
            </IconAction>
          </div>
          <Button onClick={onCreate} className="hidden lg:inline-flex">
            <Plus className="size-4" strokeWidth={2.1} /> Novo opravilo
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" className="bg-header-button font-normal" onClick={onToday}>
            Danes
          </Button>
          <div className={cn("flex", SEGMENT_TRACK, "bg-header-button")} role="group" aria-label="Pogled koledarja">
            {(Object.keys(VIEW_LABELS) as CalendarView[]).map((v) => (
              <Button
                key={v}
                variant="ghost"
                size="sm"
                aria-pressed={view === v}
                onClick={() => onViewChange(v)}
                className={cn(
                  segmentPosition(view === v),
                  "px-3 font-normal",
                  (v === "month" || v === "week") && "hidden lg:inline-flex",
                )}
              >
                {VIEW_LABELS[v]}
              </Button>
            ))}
          </div>
        </div>
        <Combobox
          value={categoryFilter}
          onChange={onCategoryFilter}
          options={categoryOptions}
          icon={Shapes}
          className="hidden w-52 bg-header-button lg:flex"
        />
      </div>
    </div>
  );
}
