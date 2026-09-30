import type { ComboboxOption } from "@/components/ui/combobox";
import type { Machine } from "@/lib/types";

export function machineOptions(
  machines: Machine[] | null | undefined,
  lead: ComboboxOption,
): ComboboxOption[] {
  const sorted = [...(machines ?? [])].sort(
    (a, b) =>
      (a.department?.name ?? "￿").localeCompare(b.department?.name ?? "￿") ||
      `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`),
  );
  return [
    lead,
    ...sorted.map((m) => ({
      value: m.id,
      label: `${m.brand} ${m.model}`,
      keywords: `${m.brand} ${m.model} ${m.serialNo ?? ""} ${m.department?.name ?? ""}`,
      group: m.department?.name ?? "No department",
    })),
  ];
}
