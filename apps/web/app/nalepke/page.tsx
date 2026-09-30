"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, QrCode } from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import type { Department, Machine } from "@/lib/types";
import { MachineQr, machineReportUrl } from "@/components/machine-qr";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Loader } from "@/components/loader";

const ALL = "ALL";

export default function LabelsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: machines, loading } = useApi<Machine[]>(isAdmin ? "/machines" : null);
  const { data: departments } = useApi<Department[]>(isAdmin ? "/departments" : null);
  const [departmentId, setDepartmentId] = useState(ALL);
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace(`/prijava?next=${encodeURIComponent("/nalepke" + window.location.search)}`);
  }, [authLoading, user, router]);
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("ids");
    setIds(raw ? raw.split(",").filter(Boolean) : null);
  }, []);

  const selected = useMemo(() => {
    const list = (machines ?? []).filter((m) =>
      ids ? ids.includes(m.id) : m.active && (departmentId === ALL || m.departmentId === departmentId),
    );
    return [...list].sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, "sl"));
  }, [machines, ids, departmentId]);

  const departmentOptions: ComboboxOption[] = [
    { value: ALL, label: "Vsi oddelki" },
    ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];

  if (authLoading || !user) return null;
  if (!isAdmin) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nalepke tiska administrator.</p>;
  }

  return (
    <div className="min-h-dvh bg-background print:bg-qr-paper">
      <style>{"@page { size: A4; margin: 0; }"}</style>
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-3 px-4 py-4 print:hidden">
        <Button asChild variant="outline" size="icon" className="bg-header-button" aria-label="Nazaj na sredstva">
          <Link href="/sredstva">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <QrCode className="size-5" /> QR nalepke
        </h1>
        <span className="text-sm text-nav-foreground tabular-nums">{selected.length}</span>
        <div className="ml-auto flex items-center gap-2">
          {ids ? (
            <Button variant="outline" className="bg-header-button" onClick={() => setIds(null)}>
              Vsa sredstva
            </Button>
          ) : (
            <Combobox
              value={departmentId}
              onChange={setDepartmentId}
              options={departmentOptions}
              className="w-56 bg-header-button"
            />
          )}
          <Button disabled={selected.length === 0} onClick={() => window.print()}>
            Natisni
          </Button>
        </div>
        <p className="w-full text-sm text-nav-foreground">
          Pola nalepk A4, 3 × 7 (63,5 × 38,1 mm). Pri tiskanju izberite merilo 100 % in brez robov
          brskalnika. Koda odpre prijavo napake s tem strojem.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 print:hidden">
          <Loader className="size-8 text-muted-foreground" label="Nalaganje sredstev…" />
        </div>
      ) : (
        <div className="mx-auto grid w-[210mm] grid-cols-[repeat(3,63.5mm)] justify-center gap-x-[2.5mm] px-[7mm] py-[15mm] print:py-[15mm]">
          {selected.map((m) => (
            <Label key={m.id} machine={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function Label({ machine }: { machine: Machine }) {
  const name = `${machine.brand} ${machine.model}`;
  return (
    <div className="flex h-[38.1mm] w-[63.5mm] break-inside-avoid items-center gap-[2mm] overflow-hidden rounded-[2mm] bg-qr-paper p-[2mm] text-qr-ink outline outline-1 outline-border print:rounded-none print:outline-0">
      <MachineQr value={machineReportUrl(machine.id)} label={`QR koda za prijavo napake: ${name}`} className="size-[33mm] shrink-0" />
      <div className="flex min-w-0 flex-col gap-[1mm] leading-tight">
        <p className="text-[9pt] font-bold break-words">{name}</p>
        {machine.department && <p className="text-[7pt] break-words">{machine.department.name}</p>}
        {machine.serialNo && <p className="text-[6.5pt] break-all tabular-nums">#{machine.serialNo}</p>}
        <p className="mt-[1mm] text-[6.5pt] font-semibold">Napaka? Skeniraj in prijavi.</p>
      </div>
    </div>
  );
}
