"use client";

import type { DepartmentColor } from "@servis-track/shared";

import { cn } from "@/lib/utils";
import { ColorPicker } from "@/components/color-picker";

export const DEPARTMENT_COLOR_META: Record<DepartmentColor, { label: string; dot: string }> = {
  BLUE: { label: "Modra", dot: "bg-department-blue" },
  SKY: { label: "Nebesna", dot: "bg-department-sky" },
  TEAL: { label: "Turkizna", dot: "bg-department-teal" },
  GREEN: { label: "Zelena", dot: "bg-department-green" },
  LIME: { label: "Limeta", dot: "bg-department-lime" },
  AMBER: { label: "Jantarna", dot: "bg-department-amber" },
  ORANGE: { label: "Oranžna", dot: "bg-department-orange" },
  PINK: { label: "Rožnata", dot: "bg-department-pink" },
  VIOLET: { label: "Vijolična", dot: "bg-department-violet" },
  GRAY: { label: "Siva", dot: "bg-department-gray" },
};

export const DEPARTMENT_COLORS = Object.keys(DEPARTMENT_COLOR_META) as DepartmentColor[];

const OPTIONS = DEPARTMENT_COLORS.map((c) => ({ value: c, ...DEPARTMENT_COLOR_META[c] }));

const SWATCH = "rounded-[3px]";

export function DepartmentBadge({
  department,
  className,
}: {
  department: { name: string; color?: DepartmentColor | null };
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border bg-transparent px-2 py-0.5 align-middle text-sm",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-2 shrink-0", SWATCH, DEPARTMENT_COLOR_META[department.color ?? "GRAY"].dot)}
      />
      <span className="truncate">{department.name}</span>
    </span>
  );
}

export function DepartmentColorPicker({
  value,
  disabled,
  onChange,
}: {
  value: DepartmentColor | undefined;
  disabled: boolean;
  onChange: (color: DepartmentColor) => void;
}) {
  return (
    <ColorPicker
      value={value ?? "GRAY"}
      options={OPTIONS}
      heading="Barva oddelka"
      swatch={SWATCH}
      columns={2}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
