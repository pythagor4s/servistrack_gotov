import { stripMarkdown, type KbSort } from "@servis-track/shared";
import { tokenize, type Token } from "./text";
import { synonymsOf } from "./synonyms";
import { FuzzyIndex } from "./fuzzy";
import { causeSection } from "./sections";

export type KbField = "title" | "tags" | "cause" | "context" | "body";
const FIELDS: readonly KbField[] = ["title", "tags", "cause", "context", "body"];
const FIELD_WEIGHT: readonly number[] = [3.0, 2.5, 1.6, 1.2, 1.0];
const FIELD_B: readonly number[] = [0.4, 0.2, 0.75, 0.2, 0.75];
const K1 = 1.2;

export type MatchKind = "exact" | "prefix" | "synonym" | "fuzzy" | "related";

const SNIPPET_LENGTH = 190;

export interface KbDoc {
  id: string;
  title: string;
  body: string;
  tags: string[];
  categoryId: string | null;
  categoryName: string | null;
  type: string;
  departmentId: string | null;
  departmentName: string | null;
  machineIds: string[];
  machineLabel: string | null;
  ticketId: string | null;
  pinned: boolean;
  views: number;
  helpfulUp: number;
  helpfulDown: number;
  createdAt: number;
}

export type Range = [number, number];

export interface KbHitMatch {
  term: string;
  kind: MatchKind;
  as: string;
  field: KbField;
}

export interface KbHit {
  id: string;
  score: number;
  relevance: number;
  matchPct: number;
  matchedTerms: number;
  queryTerms: number;
  title: Range[];
  snippet: { text: string; ranges: Range[]; clippedStart: boolean; clippedEnd: boolean };
  tags: string[];
  matched: KbHitMatch[];
}

export interface KbFilters {
  categoryId?: string;
  type?: string;
  departmentId?: string;
  machineId?: string;
  source?: "ticket" | "manual";
  tag?: string;
  pinned?: boolean;
  excludeTicketId?: string;
  excludeIds?: ReadonlySet<string>;
}

export interface KbSearchOptions extends KbFilters {
  q?: string;
  sort?: KbSort;
  limit: number;
  offset: number;
  boostMachineId?: string;
  boostDepartmentId?: string;
}

export interface KbFacetBucket {
  value: string;
  count: number;
}

export interface KbFacets {
  category: KbFacetBucket[];
  type: KbFacetBucket[];
  source: KbFacetBucket[];
  department: KbFacetBucket[];
  machine: KbFacetBucket[];
  tag: KbFacetBucket[];
  pinned: number;
}

export interface KbSearchResult {
  total: number;
  hits: KbHit[];
  facets: KbFacets;
  suggestion: string | null;
}

interface IndexedDoc {
  doc: KbDoc;
  plain: string;
  plainTokens: Token[];
  titleTokens: Token[];
  tagStems: string[][];
  lengths: number[];
}

interface Posting {
  doc: number;
  tf: number[];
}

interface Expansion {
  stem: string;
  weight: number;
  kind: MatchKind;
}

interface QueryTerm {
  display: string;
  term: string;
  stem: string;
  start: number;
  end: number;
  expansions: Expansion[];
  idf: number;
  known: boolean;
  completes: boolean;
}

interface Scored {
  doc: number;
  score: number;
  coverage: number;
  matchedTerms: number;
  winners: ({ expansion: Expansion; field: number } | null)[];
}

export class KbEngine {
  private readonly docs: IndexedDoc[] = [];
  private readonly byId = new Map<string, number>();
  private readonly postings = new Map<string, Posting[]>();
  private readonly avgLength: number[] = FIELDS.map(() => 0);
  private readonly vocabulary = new Map<string, number>();
  private readonly termStem = new Map<string, string>();
  private readonly termDisplay = new Map<string, Map<string, number>>();
  private readonly stemDisplay = new Map<string, Map<string, number>>();
  private readonly stemsByPrefix = new Map<string, string[]>();
  private readonly sortedTerms: string[];
  private readonly fuzzy: FuzzyIndex;

  constructor(input: readonly KbDoc[]) {
    for (const doc of input) this.add(doc);
    const n = Math.max(1, this.docs.length);
    for (let f = 0; f < FIELDS.length; f++) {
      this.avgLength[f] = Math.max(1, this.docs.reduce((s, d) => s + d.lengths[f]!, 0) / n);
    }
    for (const stem of this.postings.keys()) {
      if (stem.length < 4) continue;
      const key = stem.slice(0, 4);
      let list = this.stemsByPrefix.get(key);
      if (!list) this.stemsByPrefix.set(key, (list = []));
      list.push(stem);
    }
    this.sortedTerms = [...this.vocabulary.keys()].sort();
    this.fuzzy = new FuzzyIndex(this.vocabulary);
  }

  get size(): number {
    return this.docs.length;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  get(id: string): KbDoc | undefined {
    const i = this.byId.get(id);
    return i === undefined ? undefined : this.docs[i]!.doc;
  }

  all(): KbDoc[] {
    return this.docs.map((d) => d.doc);
  }

  bumpViews(id: string): void {
    const i = this.byId.get(id);
    if (i !== undefined) this.docs[i]!.doc.views++;
  }

  stats(): { articles: number; categories: number; machines: number; views: number; fromTickets: number } {
    const all = this.all();
    return {
      articles: all.length,
      categories: new Set(all.map((d) => d.categoryId).filter(Boolean)).size,
      machines: new Set(all.flatMap((d) => d.machineIds)).size,
      views: all.reduce((s, d) => s + d.views, 0),
      fromTickets: all.filter((d) => d.ticketId !== null).length,
    };
  }

  private add(doc: KbDoc) {
    const index = this.docs.length;
    const plain = stripMarkdown(doc.body).replace(/\s+/g, " ").trim();
    const fields = [
      doc.title,
      doc.tags.join(" · "),
      causeSection(doc.body) ?? "",
      [doc.categoryName, doc.machineLabel, doc.departmentName].filter(Boolean).join(" · "),
      plain,
    ];
    const tokens = fields.map((text) => tokenize(text));
    const lengths = tokens.map((t) => t.length);
    const tf = new Map<string, number[]>();
    tokens.forEach((list, f) => {
      for (const t of list) {
        let row = tf.get(t.stem);
        if (!row) tf.set(t.stem, (row = FIELDS.map(() => 0)));
        row[f]!++;
        this.vocabulary.set(t.term, (this.vocabulary.get(t.term) ?? 0) + 1);
        this.termStem.set(t.term, t.stem);
        count(this.termDisplay, t.term, t.display);
        count(this.stemDisplay, t.stem, t.display);
      }
    });
    for (const [stem, row] of tf) {
      let list = this.postings.get(stem);
      if (!list) this.postings.set(stem, (list = []));
      list.push({ doc: index, tf: row });
    }
    this.byId.set(doc.id, index);
    this.docs.push({
      doc,
      plain,
      plainTokens: tokens[4]!,
      titleTokens: tokens[0]!,
      tagStems: doc.tags.map((tag) => tokenize(tag).map((t) => t.stem)),
      lengths,
    });
  }

  private idf(stem: string): number {
    const df = this.postings.get(stem)?.length ?? 0;
    const n = this.docs.length;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }

  private maxIdf(): number {
    return Math.log(1 + (this.docs.length + 0.5) / 0.5);
  }

  private relatedStems(stem: string): string[] {
    if (stem.length < 4 || /\d/.test(stem)) return [];
    const out: string[] = [];
    for (const other of this.stemsByPrefix.get(stem.slice(0, 4)) ?? []) {
      if (other === stem) continue;
      const p = commonPrefix(stem, other);
      if (p >= 4 && p >= Math.min(stem.length, other.length) - 1) out.push(other);
    }
    return out;
  }

  private prefixStems(term: string, limit = 40): string[] {
    const out = new Set<string>();
    let lo = 0;
    let hi = this.sortedTerms.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedTerms[mid]! < term) lo = mid + 1;
      else hi = mid;
    }
    for (let i = lo; i < this.sortedTerms.length && out.size < limit; i++) {
      const t = this.sortedTerms[i]!;
      if (!t.startsWith(term)) break;
      out.add(this.termStem.get(t)!);
    }
    return [...out];
  }

  private parse(q: string): QueryTerm[] {
    const tokens = tokenize(q);
    const endsWithSpace = /\s$/.test(q);
    const seen = new Set<string>();
    const terms: QueryTerm[] = [];
    tokens.forEach((t, i) => {
      if (seen.has(t.stem)) return;
      seen.add(t.stem);
      const isLast = i === tokens.length - 1 && !endsWithSpace;
      const expansions = new Map<string, Expansion>();
      const add = (stem: string, weight: number, kind: MatchKind) => {
        if (!this.postings.has(stem)) return;
        const prev = expansions.get(stem);
        if (!prev || prev.weight < weight) expansions.set(stem, { stem, weight, kind });
      };
      const known = this.postings.has(t.stem);
      add(t.stem, 1, "exact");
      if (isLast && t.term.length >= 3) {
        for (const s of this.prefixStems(t.term)) add(s, 0.8, "prefix");
      }
      for (const s of synonymsOf(t.stem)) add(s, 0.6, "synonym");
      for (const s of this.relatedStems(t.stem)) add(s, 0.45, "related");
      if (!known) {
        for (const m of this.fuzzy.lookup(t.term)) {
          const s = this.termStem.get(m.term)!;
          add(s, m.distance === 1 ? 0.55 : 0.35, "fuzzy");
          for (const syn of synonymsOf(s)) add(syn, 0.35, "synonym");
        }
      }
      const list = [...expansions.values()];
      const idf = known
        ? this.idf(t.stem)
        : list.length > 0
          ? Math.max(...list.map((e) => this.idf(e.stem)))
          : this.maxIdf();
      terms.push({
        display: t.display,
        term: t.term,
        stem: t.stem,
        start: t.start,
        end: t.end,
        expansions: list,
        idf,
        known,
        completes: list.some((e) => e.kind === "prefix"),
      });
    });
    return terms;
  }

  private bm25(posting: Posting, stem: string): { score: number; field: number } {
    const lengths = this.docs[posting.doc]!.lengths;
    let tfTilde = 0;
    let bestField = 0;
    let bestPart = -1;
    for (let f = 0; f < FIELDS.length; f++) {
      const tf = posting.tf[f]!;
      if (tf === 0) continue;
      const norm = 1 - FIELD_B[f]! + FIELD_B[f]! * (lengths[f]! / this.avgLength[f]!);
      const part = (FIELD_WEIGHT[f]! * tf) / norm;
      tfTilde += part;
      if (part > bestPart) {
        bestPart = part;
        bestField = f;
      }
    }
    const score = (this.idf(stem) * tfTilde * (K1 + 1)) / (K1 + tfTilde);
    return { score, field: bestField };
  }

  private rank(terms: QueryTerm[], filters: KbFilters): Scored[] {
    const n = terms.length;
    const perDoc = new Map<number, Scored & { parts: number[] }>();
    terms.forEach((term, i) => {
      for (const expansion of term.expansions) {
        for (const posting of this.postings.get(expansion.stem) ?? []) {
          if (!this.passes(posting.doc, filters)) continue;
          const { score, field } = this.bm25(posting, expansion.stem);
          const value = score * expansion.weight;
          let entry = perDoc.get(posting.doc);
          if (!entry) {
            entry = {
              doc: posting.doc,
              score: 0,
              coverage: 0,
              matchedTerms: 0,
              winners: new Array(n).fill(null),
              parts: new Array<number>(n).fill(0),
            };
            perDoc.set(posting.doc, entry);
          }
          if (value > entry.parts[i]!) {
            entry.parts[i] = value;
            entry.winners[i] = { expansion, field };
          }
        }
      }
    });

    const idfTotal = terms.reduce((s, t) => s + t.idf, 0) || 1;
    const out: Scored[] = [];
    for (const entry of perDoc.values()) {
      let raw = 0;
      let covered = 0;
      let matched = 0;
      entry.parts.forEach((part, i) => {
        raw += part;
        const w = entry.winners[i];
        if (w) {
          covered += terms[i]!.idf * w.expansion.weight;
          matched++;
        }
      });
      const coverage = covered / idfTotal;
      const score = raw * (0.25 + 0.75 * coverage) * this.phraseBonus(entry.doc, terms);
      out.push({ doc: entry.doc, score, coverage, matchedTerms: matched, winners: entry.winners });
    }
    return out;
  }

  private phraseBonus(doc: number, terms: QueryTerm[]): number {
    if (terms.length < 2) return 1;
    const stems = this.docs[doc]!.titleTokens.map((t) => t.stem);
    let bonus = 1;
    let pairs = 0;
    for (let i = 0; i + 1 < terms.length && pairs < 3; i++) {
      const a = terms[i]!.stem;
      const b = terms[i + 1]!.stem;
      for (let j = 0; j + 1 < stems.length; j++) {
        if (stems[j] === a && stems[j + 1] === b) {
          bonus *= 1.15;
          pairs++;
          break;
        }
      }
    }
    return bonus;
  }

  private passes(index: number, f: KbFilters, skip?: keyof KbFilters): boolean {
    const d = this.docs[index]!.doc;
    if (f.excludeIds?.has(d.id)) return false;
    if (f.excludeTicketId && d.ticketId === f.excludeTicketId) return false;
    if (skip !== "categoryId" && f.categoryId) {
      if (f.categoryId === "none" ? d.categoryId !== null : d.categoryId !== f.categoryId) return false;
    }
    if (skip !== "type" && f.type && d.type !== f.type) return false;
    if (skip !== "departmentId" && f.departmentId && d.departmentId !== f.departmentId) return false;
    if (skip !== "machineId" && f.machineId && !d.machineIds.includes(f.machineId)) return false;
    if (skip !== "source" && f.source && (f.source === "ticket") !== (d.ticketId !== null)) return false;
    if (skip !== "tag" && f.tag && !d.tags.includes(f.tag.toLowerCase())) return false;
    if (skip !== "pinned" && f.pinned !== undefined && d.pinned !== f.pinned) return false;
    return true;
  }

  private boost(index: number, o: KbSearchOptions): number {
    const d = this.docs[index]!.doc;
    let factor = d.pinned ? 1.05 : 1;
    const net = d.helpfulUp - d.helpfulDown;
    factor *= 1 + 0.05 * Math.sign(net) * Math.log2(1 + Math.abs(net));
    if (o.boostMachineId && d.machineIds.includes(o.boostMachineId)) factor *= 1.35;
    else if (o.boostDepartmentId && d.departmentId === o.boostDepartmentId) factor *= 1.1;
    return factor;
  }

  search(o: KbSearchOptions): KbSearchResult {
    const q = (o.q ?? "").trim();
    const terms = q ? this.parse(q) : [];
    const filters: KbFilters = o;
    const active = terms.length > 0;

    let matched: Scored[];
    if (active) {
      matched = this.rank(terms, { excludeIds: o.excludeIds, excludeTicketId: o.excludeTicketId });
      for (const m of matched) m.score *= this.boost(m.doc, o);
      const top = matched.reduce((mx, m) => Math.max(mx, m.score), 0);
      const cut = top * (terms.length >= 3 ? 0.12 : 0.04);
      matched = matched.filter((m) => m.score >= cut && m.score > 0);
    } else {
      matched = this.docs
        .map((_, i) => i)
        .filter((i) => this.passes(i, { excludeIds: o.excludeIds, excludeTicketId: o.excludeTicketId }))
        .map((doc) => ({ doc, score: 0, coverage: 0, matchedTerms: 0, winners: [] }));
    }

    const facets = this.facets(matched, filters);
    const visible = matched.filter((m) => this.passes(m.doc, filters));
    const sort: KbSort = o.sort ?? "relevance";
    visible.sort((a, b) => this.compare(a, b, sort, active));
    const top = visible.reduce((mx, m) => Math.max(mx, m.score), 0) || 1;

    const hits = visible
      .slice(o.offset, o.offset + o.limit)
      .map((m) => this.hit(m, terms, top));

    return { total: visible.length, hits, facets, suggestion: this.suggest(q, terms) };
  }

  private compare(a: Scored, b: Scored, sort: KbSort, active: boolean): number {
    const da = this.docs[a.doc]!.doc;
    const db = this.docs[b.doc]!.doc;
    if (!active && da.pinned !== db.pinned) return da.pinned ? -1 : 1;
    switch (sort) {
      case "recent":
        return db.createdAt - da.createdAt;
      case "oldest":
        return da.createdAt - db.createdAt;
      case "views":
        return db.views - da.views || db.createdAt - da.createdAt;
      case "helpful":
        return (
          db.helpfulUp - db.helpfulDown - (da.helpfulUp - da.helpfulDown) ||
          db.views - da.views ||
          db.createdAt - da.createdAt
        );
      case "az":
        return da.title.localeCompare(db.title, "sl");
      default:
        return active ? b.score - a.score || db.createdAt - da.createdAt : db.createdAt - da.createdAt;
    }
  }

  private facets(matched: Scored[], f: KbFilters): KbFacets {
    const tally = (skip: keyof KbFilters, key: (d: KbDoc) => (string | null)[]) => {
      const counts = new Map<string, number>();
      for (const m of matched) {
        if (!this.passes(m.doc, f, skip)) continue;
        for (const value of new Set(key(this.docs[m.doc]!.doc))) {
          const k = value ?? "none";
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
      }
      return [...counts]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    };
    return {
      category: tally("categoryId", (d) => [d.categoryId]),
      type: tally("type", (d) => [d.type]),
      source: tally("source", (d) => [d.ticketId ? "ticket" : "manual"]),
      department: tally("departmentId", (d) => [d.departmentId]).filter((b) => b.value !== "none"),
      machine: tally("machineId", (d) => d.machineIds),
      tag: tally("tag", (d) => d.tags).slice(0, 24),
      pinned: matched.filter((m) => this.passes(m.doc, f, "pinned") && this.docs[m.doc]!.doc.pinned).length,
    };
  }

  private hit(m: Scored, terms: QueryTerm[], top: number): KbHit {
    const indexed = this.docs[m.doc]!;
    const stems = new Set<string>();
    const matched: KbHitMatch[] = [];
    m.winners.forEach((w, i) => {
      if (!w) return;
      const term = terms[i]!;
      for (const e of term.expansions) stems.add(e.stem);
      matched.push({
        term: term.display,
        kind: w.expansion.kind,
        as: this.displayOf(w.expansion.stem),
        field: FIELDS[w.field]!,
      });
    });
    return {
      id: indexed.doc.id,
      score: round(m.score, 4),
      relevance: terms.length ? Math.max(1, Math.round((100 * m.score) / top)) : 0,
      matchPct: Math.round(100 * Math.min(1, m.coverage)),
      matchedTerms: m.matchedTerms,
      queryTerms: terms.length,
      title: ranges(indexed.titleTokens, stems),
      snippet: this.snippet(indexed, stems),
      tags: indexed.doc.tags.filter((_, i) => indexed.tagStems[i]!.some((s) => stems.has(s))),
      matched,
    };
  }

  private snippet(indexed: IndexedDoc, stems: ReadonlySet<string>): KbHit["snippet"] {
    const text = indexed.plain;
    const hits = indexed.plainTokens.filter((t) => stems.has(t.stem));
    let start = 0;
    if (hits.length > 0) {
      let best = -1;
      for (const anchor of hits) {
        const from = Math.max(0, anchor.start - 40);
        const distinct = new Set(
          hits.filter((h) => h.start >= from && h.end <= from + SNIPPET_LENGTH).map((h) => h.stem),
        ).size;
        if (distinct > best) {
          best = distinct;
          start = from;
        }
      }
    }
    if (start > 0) {
      const space = text.indexOf(" ", start);
      start = space >= 0 && space < start + 20 ? space + 1 : start;
    }
    let end = Math.min(text.length, start + SNIPPET_LENGTH);
    if (end < text.length) {
      const space = text.lastIndexOf(" ", end);
      if (space > start + SNIPPET_LENGTH * 0.6) end = space;
    }
    const slice = text.slice(start, end);
    const inWindow = hits
      .filter((h) => h.start >= start && h.end <= end)
      .map((h): Range => [h.start - start, h.end - start]);
    return {
      text: slice,
      ranges: merge(inWindow),
      clippedStart: start > 0,
      clippedEnd: end < text.length,
    };
  }

  private displayOf(stem: string): string {
    const forms = this.stemDisplay.get(stem);
    if (!forms) return stem;
    return [...forms].sort((a, b) => b[1] - a[1])[0]![0];
  }

  private suggest(q: string, terms: QueryTerm[]): string | null {
    let out = q;
    let changed = false;
    for (const t of [...terms].sort((a, b) => b.start - a.start)) {
      if (t.known || t.completes) continue;
      const best = this.fuzzy.lookup(t.term, 1)[0];
      if (!best) continue;
      const forms = this.termDisplay.get(best.term);
      const display = forms ? [...forms].sort((a, b) => b[1] - a[1])[0]![0] : best.term;
      out = out.slice(0, t.start) + display + out.slice(t.end);
      changed = true;
    }
    return changed ? out : null;
  }

  similar(id: string, limit: number, filters: KbFilters = {}): { id: string; score: number }[] {
    const i = this.byId.get(id);
    if (i === undefined) return [];
    const weights = new Map<string, number>();
    for (const [stem, list] of this.postings) {
      const p = list.find((x) => x.doc === i);
      if (!p) continue;
      const w =
        (p.tf[0]! * 3 + p.tf[1]! * 2.5 + p.tf[2]! * 1.6 + p.tf[4]! * 0.5) * this.idf(stem);
      if (w > 0 && !/^\d+$/.test(stem)) weights.set(stem, w);
    }
    const terms: QueryTerm[] = [...weights]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([stem]) => ({
        display: this.displayOf(stem),
        term: stem,
        stem,
        start: 0,
        end: 0,
        expansions: [{ stem, weight: 1, kind: "exact" as const }],
        idf: this.idf(stem),
        known: true,
        completes: false,
      }));
    const excludeIds = new Set([...(filters.excludeIds ?? []), id]);
    return this.rank(terms, { ...filters, excludeIds })
      .filter((m) => m.matchedTerms >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((m) => ({ id: this.docs[m.doc]!.doc.id, score: round(m.score, 4) }));
  }
}

function count(map: Map<string, Map<string, number>>, key: string, value: string) {
  let inner = map.get(key);
  if (!inner) map.set(key, (inner = new Map()));
  inner.set(value, (inner.get(value) ?? 0) + 1);
}

function commonPrefix(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

function ranges(tokens: readonly Token[], stems: ReadonlySet<string>): Range[] {
  return merge(tokens.filter((t) => stems.has(t.stem)).map((t): Range => [t.start, t.end]));
}

function merge(list: Range[]): Range[] {
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const out: Range[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push([r[0], r[1]]);
  }
  return out;
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
