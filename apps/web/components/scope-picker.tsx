"use client";

import { Combobox } from "@/components/ui/combobox";
import { PropertyRow } from "@/components/ui/property-list";
import { LayoutList, Network } from "@/components/icons";
import { machineOptions } from "@/lib/machines";
import type { Department, Machine } from "@/lib/types";

export const NONE = "NONE";

export function ScopeRows({
  isMachine,
  machines,
  departments,
  machineId,
  onMachineChange,
  departmentId,
  onDepartmentChange,
  machineLead,
  error,
}: {
  isMachine: boolean;
  machines: Machine[] | null | undefined;
  departments: Department[] | null | undefined;
  machineId: string;
  onMachineChange: (v: string) => void;
  departmentId: string;
  onDepartmentChange: (v: string) => void;
  machineLead: string;
  error?: string;
}) {
  const selectedMachine = machines?.find((m) => m.id === machineId);
  if (isMachine) {
    return (
      <>
        <PropertyRow label="Stroj" error={error}>
          <Combobox
            variant="inline"
            emptyValue={NONE}
            value={machineId}
            onChange={onMachineChange}
            options={machineOptions(machines, { value: NONE, label: machineLead })}
            icon={LayoutList}
            searchable
            searchPlaceholder="Iskanje po znamki, modelu…"
            listClassName="max-h-60"
          />
        </PropertyRow>
        <PropertyRow label="Oddelek">
          <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <Network className="size-4 shrink-0" />
            <span className="truncate">
              {selectedMachine?.department
                ? `${selectedMachine.department.name} (od stroja)`
                : "Prevzame se od stroja"}
            </span>
          </span>
        </PropertyRow>
      </>
    );
  }
  return (
    <PropertyRow label="Oddelek">
      <Combobox
        variant="inline"
        emptyValue={NONE}
        value={departmentId}
        onChange={onDepartmentChange}
        options={[
          { value: NONE, label: "Brez" },
          ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
        ]}
        icon={Network}
        searchable
        searchPlaceholder="Iskanje oddelkov…"
        listClassName="max-h-60"
      />
    </PropertyRow>
  );
}
