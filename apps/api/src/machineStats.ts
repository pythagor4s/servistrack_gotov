export type StatsTicket = {
  createdAt: Date;
  faultDate: Date | null;
  resolvedAt: Date | null;
  machineDown: boolean;
  serviceCostCents: number | null;
};

export type MachineStats = {
  since: string;
  faults: number;
  stoppages: number;
  downtimeHours: number;
  costCents: number;
};

const HOUR = 3_600_000;

export function machineStats(tickets: StatsTicket[], now = new Date(), months = 12): MachineStats {
  const since = new Date(now);
  since.setMonth(since.getMonth() - months);
  let faults = 0;
  let stoppages = 0;
  let downMs = 0;
  let costCents = 0;
  for (const t of tickets) {
    const inWindow = t.createdAt >= since;
    if (inWindow) {
      faults += 1;
      costCents += t.serviceCostCents ?? 0;
    }
    if (!t.machineDown) continue;
    const start = Math.max((t.faultDate ?? t.createdAt).getTime(), since.getTime());
    const end = Math.min((t.resolvedAt ?? now).getTime(), now.getTime());
    if (end > start) downMs += end - start;
    if (inWindow) stoppages += 1;
  }
  return {
    since: since.toISOString(),
    faults,
    stoppages,
    downtimeHours: Math.round((downMs / HOUR) * 10) / 10,
    costCents,
  };
}
