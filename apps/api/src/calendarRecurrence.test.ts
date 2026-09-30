import { describe, it, expect } from "vitest";
import {
  addDays,
  expandOccurrences,
  isDateOnly,
  isOccurrence,
  weekdayIndex,
  type RecurrenceRule,
} from "@servis-track/shared";

const rule = (over: Partial<RecurrenceRule>): RecurrenceRule => ({
  date: "2026-09-07",
  recurrenceUnit: null,
  recurrenceInterval: 1,
  recurrenceUntil: null,
  ...over,
});

describe("calendar dates", () => {
  it("rejects dates that do not exist", () => {
    expect(isDateOnly("2026-02-28")).toBe(true);
    expect(isDateOnly("2028-02-29")).toBe(true);
    expect(isDateOnly("2026-02-29")).toBe(false);
    expect(isDateOnly("2026-02-30")).toBe(false);
    expect(isDateOnly("2026-9-7")).toBe(false);
  });

  it("counts days across the DST change without drifting", () => {
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-03-28", 7)).toBe("2026-04-04");
  });

  it("starts the week on Monday", () => {
    expect(weekdayIndex("2026-09-14")).toBe(0);
    expect(weekdayIndex("2026-09-20")).toBe(6);
  });
});

describe("expandOccurrences", () => {
  it("returns a one-off task only when its day is in range", () => {
    expect(expandOccurrences(rule({}), "2026-09-01", "2026-09-30")).toEqual(["2026-09-07"]);
    expect(expandOccurrences(rule({}), "2026-09-08", "2026-09-30")).toEqual([]);
    expect(expandOccurrences(rule({}), "2026-08-01", "2026-09-06")).toEqual([]);
  });

  it("repeats weekly and every two weeks", () => {
    expect(expandOccurrences(rule({ recurrenceUnit: "WEEK" }), "2026-09-01", "2026-09-30")).toEqual([
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
    ]);
    expect(
      expandOccurrences(rule({ recurrenceUnit: "WEEK", recurrenceInterval: 2 }), "2026-09-10", "2026-10-31"),
    ).toEqual(["2026-09-21", "2026-10-05", "2026-10-19"]);
  });

  it("never yields a day before the start", () => {
    expect(expandOccurrences(rule({ recurrenceUnit: "WEEK" }), "2026-08-01", "2026-09-10")).toEqual([
      "2026-09-07",
    ]);
  });

  it("stops at recurrenceUntil, inclusive", () => {
    const r = rule({ recurrenceUnit: "WEEK", recurrenceUntil: "2026-09-21" });
    expect(expandOccurrences(r, "2026-09-01", "2026-12-31")).toEqual([
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
    ]);
  });

  it("keeps the 31st monthly: last day of short months, then back to the 31st", () => {
    const r = rule({ date: "2026-01-31", recurrenceUnit: "MONTH" });
    expect(expandOccurrences(r, "2026-01-01", "2026-05-31")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("finds the right months when the range starts late in a long series", () => {
    const r = rule({ date: "2025-01-31", recurrenceUnit: "MONTH", recurrenceInterval: 3 });
    expect(expandOccurrences(r, "2026-04-01", "2026-08-31")).toEqual(["2026-04-30", "2026-07-31"]);
  });

  it("moves a 29 February yearly task to the 28th in common years", () => {
    const r = rule({ date: "2028-02-29", recurrenceUnit: "YEAR" });
    expect(expandOccurrences(r, "2028-01-01", "2032-12-31")).toEqual([
      "2028-02-29",
      "2029-02-28",
      "2030-02-28",
      "2031-02-28",
      "2032-02-29",
    ]);
  });

  it("tells whether a day is an occurrence", () => {
    const r = rule({ recurrenceUnit: "WEEK", recurrenceInterval: 2 });
    expect(isOccurrence(r, "2026-09-21")).toBe(true);
    expect(isOccurrence(r, "2026-09-14")).toBe(false);
  });
});
