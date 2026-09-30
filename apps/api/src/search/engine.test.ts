import { describe, expect, it } from "vitest";
import corpus from "./__fixtures__/kb-corpus.json";
import { KbEngine, type KbDoc } from "./engine";
import { GOLDEN } from "./golden";

const docs = corpus as KbDoc[];
const engine = new KbEngine(docs);
const search = (q: string, extra: Partial<Parameters<KbEngine["search"]>[0]> = {}) =>
  engine.search({ q, limit: 20, offset: 0, ...extra });

describe("golden set", () => {
  it.each(GOLDEN.map((g) => [g.q, g.expect] as const))(
    "%s -> one of %j in the top 3",
    (q, expected) => {
      const top3 = search(q).hits.slice(0, 3).map((h) => h.id);
      expect(top3.some((id) => expected.includes(id))).toBe(true);
    },
  );
});

describe("ranking", () => {
  it("explains a synonym match: vakum -> podtlak", () => {
    const [first] = search("vakum").hits;
    const match = first!.matched.find((m) => m.term === "vakum");
    expect(match?.kind).toMatch(/synonym|fuzzy/);
  });

  it("returns highlight ranges that point at matched words", () => {
    const hit = search("podtlak").hits[0]!;
    const doc = engine.get(hit.id)!;
    for (const [a, b] of hit.title) {
      expect(doc.title.slice(a, b).toLowerCase()).toMatch(/^podtlak/);
    }
    for (const [a, b] of hit.snippet.ranges) {
      expect(hit.snippet.text.slice(a, b).toLowerCase()).toMatch(/podtlak|vakuum|vakum|sesanj/);
    }
  });

  it("gives relevance 100 to the best hit and a coverage percentage", () => {
    const [first, second] = search("tangencialni noz preskakuje").hits;
    expect(first!.relevance).toBe(100);
    expect(second!.relevance).toBeLessThanOrEqual(100);
    expect(first!.matchPct).toBeGreaterThan(50);
  });

  it("suggests a correction for a typo, not for a word being typed", () => {
    expect(search("kompersor").suggestion).toBe("kompresor");
    expect(search("podtl").suggestion).toBeNull();
  });

  it("boosts the machine the ticket is about", () => {
    const plain = search("podtlak na mizi").hits.map((h) => h.id);
    const zund = docs.find((d) => d.id === "kb_t052")!.machineIds[0]!;
    const boosted = search("podtlak na mizi", { boostMachineId: zund }).hits.map((h) => h.id);
    expect(boosted.indexOf("kb_t052")).toBeLessThan(plain.indexOf("kb_t052"));
  });

  it("skips the article of the ticket it is asked from", () => {
    const own = docs.find((d) => d.id === "kb_t003")!.ticketId!;
    const ids = search("podtlak ne drži pole", { excludeTicketId: own }).hits.map((h) => h.id);
    expect(ids).not.toContain("kb_t003");
  });
});

describe("browsing without a query", () => {
  it("lists everything, pinned first, then newest", () => {
    const result = search("");
    expect(result.total).toBe(docs.length);
    const pinned = result.hits.filter((h) => engine.get(h.id)!.pinned).length;
    expect(result.hits.slice(0, pinned).every((h) => engine.get(h.id)!.pinned)).toBe(true);
  });

  it("sorts A-Z with Slovenian collation", () => {
    const listed = search("", { sort: "az", limit: 100 }).hits.map((h) => engine.get(h.id)!);
    const unpinned = listed.filter((d) => !d.pinned).map((d) => d.title);
    expect(unpinned).toEqual([...unpinned].sort((a, b) => a.localeCompare(b, "sl")));
  });
});

describe("filters and facets", () => {
  it("filters by category and still counts the other categories (disjunctive facet)", () => {
    const all = search("");
    const result = search("", { categoryId: "fc_zrak" });
    expect(result.hits.every((h) => engine.get(h.id)!.categoryId === "fc_zrak")).toBe(true);
    expect(result.facets.category.length).toBe(all.facets.category.length);
    const zrak = result.facets.category.find((b) => b.value === "fc_zrak")!;
    expect(zrak.count).toBe(result.total);
  });

  it("narrows by source and by tag", () => {
    const tickets = search("", { source: "ticket" });
    expect(tickets.hits.every((h) => engine.get(h.id)!.ticketId !== null)).toBe(true);
    const tagged = search("", { tag: "E-042" });
    expect(tagged.hits.map((h) => h.id).sort()).toEqual(["kb_003", "kb_t001"]);
  });

  it("counts facets over the query's matches only", () => {
    const result = search("podtlak");
    const counted = result.facets.category.reduce((s, b) => s + b.count, 0);
    expect(counted).toBe(result.total);
  });
});

describe("similar", () => {
  it("finds other vacuum articles for a vacuum article, never itself", () => {
    const ids = engine.similar("kb_005", 5).map((s) => s.id);
    expect(ids).not.toContain("kb_005");
    expect(ids.slice(0, 3)).toEqual(expect.arrayContaining(["kb_t003"]));
  });
});
