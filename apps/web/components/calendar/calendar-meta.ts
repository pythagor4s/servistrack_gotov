import type { CalendarColor } from "@servis-track/shared";

export const CALENDAR_COLOR_META: Record<
  CalendarColor,
  { label: string; dot: string; text: string; fill: string }
> = {
  BLUE: {
    label: "Modra",
    dot: "bg-calendar-blue",
    text: "text-calendar-blue",
    fill: "bg-calendar-blue/15",
  },
  GREEN: {
    label: "Zelena",
    dot: "bg-calendar-green",
    text: "text-calendar-green",
    fill: "bg-calendar-green/15",
  },
  ORANGE: {
    label: "Oranžna",
    dot: "bg-calendar-orange",
    text: "text-calendar-orange",
    fill: "bg-calendar-orange/15",
  },
  RED: {
    label: "Rdeča",
    dot: "bg-calendar-red",
    text: "text-calendar-red",
    fill: "bg-calendar-red/15",
  },
  VIOLET: {
    label: "Vijolična",
    dot: "bg-calendar-violet",
    text: "text-calendar-violet",
    fill: "bg-calendar-violet/15",
  },
  GRAY: {
    label: "Siva",
    dot: "bg-calendar-gray",
    text: "text-calendar-gray",
    fill: "bg-calendar-gray/15",
  },
};

export const CALENDAR_COLORS = Object.keys(CALENDAR_COLOR_META) as CalendarColor[];

export const colorMetaOf = (color: CalendarColor | null | undefined) =>
  CALENDAR_COLOR_META[color ?? "GRAY"];
