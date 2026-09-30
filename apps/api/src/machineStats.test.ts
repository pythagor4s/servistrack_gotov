import { describe, expect, it } from "vitest";
import { machineStats } from "./machineStats";
import { closeTicketSchema, updateTicketSchema } from "@servis-track/shared";

const now = new Date("2026-09-27T12:00:00Z");
const d = (iso: string) => new Date(iso);
const base = { faultDate: null, resolvedAt: null, machineDown: false, serviceCostCents: null };

describe("machineStats (last 12 months)", () => {
  it("counts faults and cost only inside the window", () => {
    const s = machineStats(
      [
        { ...base, createdAt: d("2026-09-01T00:00:00Z"), serviceCostCents: 12_000 },
        { ...base, createdAt: d("2026-03-01T00:00:00Z"), serviceCostCents: 5_050 },
        { ...base, createdAt: d("2025-06-01T00:00:00Z"), serviceCostCents: 99_999 },
      ],
      now,
    );
    expect(s.faults).toBe(2);
    expect(s.costCents).toBe(17_050);
    expect(s.stoppages).toBe(0);
    expect(s.downtimeHours).toBe(0);
  });

  it("measures downtime from the fault time to the resolution", () => {
    const s = machineStats(
      [
        {
          ...base,
          machineDown: true,
          createdAt: d("2026-09-10T10:00:00Z"),
          faultDate: d("2026-09-10T08:00:00Z"),
          resolvedAt: d("2026-09-11T08:00:00Z"),
        },
      ],
      now,
    );
    expect(s.stoppages).toBe(1);
    expect(s.downtimeHours).toBe(24);
  });

  it("counts an open stoppage up to now", () => {
    const s = machineStats([{ ...base, machineDown: true, createdAt: d("2026-09-27T09:30:00Z") }], now);
    expect(s.downtimeHours).toBe(2.5);
  });

  it("clips a stoppage that started before the window", () => {
    const s = machineStats(
      [
        {
          ...base,
          machineDown: true,
          createdAt: d("2025-09-26T12:00:00Z"),
          resolvedAt: d("2025-09-28T12:00:00Z"),
        },
      ],
      now,
    );
    expect(s.stoppages).toBe(0);
    expect(s.downtimeHours).toBe(24);
  });
});

describe("service cost validation", () => {
  it("accepts whole cents and null, rejects fractions and negatives", () => {
    expect(closeTicketSchema.safeParse({ resolution: "x", serviceCostCents: 12050 }).success).toBe(true);
    expect(updateTicketSchema.safeParse({ serviceCostCents: null }).success).toBe(true);
    expect(updateTicketSchema.safeParse({ serviceCostCents: 12.5 }).success).toBe(false);
    expect(updateTicketSchema.safeParse({ serviceCostCents: -1 }).success).toBe(false);
  });
});
