import { describe, expect, it } from "vitest";
import { editDistance, FuzzyIndex, maxEditsFor } from "./fuzzy";
import { causeSection, causeSummary } from "./sections";

describe("editDistance", () => {
  it("counts a swap of neighbours as one edit", () => {
    expect(editDistance("kompersor", "kompresor", 2)).toBe(1);
  });

  it("stops early past the limit", () => {
    expect(editDistance("podtlak", "kompresor", 1)).toBe(2);
  });
});

describe("FuzzyIndex", () => {
  const index = new FuzzyIndex(
    new Map([
      ["kompresor", 5],
      ["podtlak", 9],
      ["tlak", 4],
      ["tla", 1],
    ]),
  );

  it("finds a typo within the allowed distance", () => {
    expect(index.lookup("kompersor")[0]).toEqual({ term: "kompresor", distance: 1 });
    expect(index.lookup("podtlk")[0]?.term).toBe("podtlak");
  });

  it("allows no edits on short words", () => {
    expect(maxEditsFor(3)).toBe(0);
    expect(index.lookup("tlk")).toEqual([]);
  });
});

describe("sections", () => {
  const md = [
    "## Izpad šob",
    "",
    "Test šob je pokazal izpade.",
    "",
    "### Vzrok",
    "",
    "Na glavi se je nabralo **strjeno** črnilo.",
    "",
    "### Postopek",
    "",
    "1. Očiščeno.",
  ].join("\n");

  it("extracts the cause section as plain text", () => {
    expect(causeSection(md)).toBe("Na glavi se je nabralo strjeno črnilo.");
  });

  it("falls back to the first paragraph when there is no cause heading", () => {
    expect(causeSummary("Senzor širine medija je bil zaprašen.\n\n1. Očiščen.")).toBe(
      "Senzor širine medija je bil zaprašen.",
    );
    expect(causeSection("Samo besedilo.")).toBeNull();
  });
});
