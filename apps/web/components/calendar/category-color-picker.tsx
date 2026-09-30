"use client";

import type { CalendarColor } from "@servis-track/shared";

import { ColorPicker } from "@/components/color-picker";
import { CALENDAR_COLOR_META, CALENDAR_COLORS } from "@/components/calendar/calendar-meta";

const OPTIONS = CALENDAR_COLORS.map((c) => ({
  value: c,
  label: CALENDAR_COLOR_META[c].label,
  dot: CALENDAR_COLOR_META[c].dot,
}));

export function CategoryColorPicker({
  value,
  disabled,
  onChange,
}: {
  value: string | undefined;
  disabled: boolean;
  onChange: (color: CalendarColor) => void;
}) {
  return (
    <ColorPicker
      value={(value as CalendarColor | undefined) ?? "GRAY"}
      options={OPTIONS}
      heading="Barva v koledarju"
      disabled={disabled}
      onChange={onChange}
    />
  );
}
