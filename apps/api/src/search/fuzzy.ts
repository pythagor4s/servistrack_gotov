export function maxEditsFor(length: number): number {
  if (length <= 3) return 0;
  if (length <= 7) return 1;
  return 2;
}

export function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const n = a.length;
  const m = b.length;
  let prev2 = new Array<number>(m + 1).fill(0);
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  let cur = new Array<number>(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2]! + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return limit + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  return prev[m]!;
}

function trigrams(word: string): string[] {
  const padded = `  ${word} `;
  const out: string[] = [];
  for (let i = 0; i + 3 <= padded.length; i++) out.push(padded.slice(i, i + 3));
  return out;
}

export interface FuzzyMatch {
  term: string;
  distance: number;
}

export class FuzzyIndex {
  private readonly byTrigram = new Map<string, string[]>();
  private readonly frequency: ReadonlyMap<string, number>;

  constructor(vocabulary: ReadonlyMap<string, number>) {
    this.frequency = vocabulary;
    for (const term of vocabulary.keys()) {
      for (const g of new Set(trigrams(term))) {
        let list = this.byTrigram.get(g);
        if (!list) this.byTrigram.set(g, (list = []));
        list.push(term);
      }
    }
  }

  lookup(term: string, limit = 3): FuzzyMatch[] {
    const maxEdits = maxEditsFor(term.length);
    if (maxEdits === 0) return [];
    const grams = trigrams(term);
    const needed = Math.max(1, grams.length - 3 * maxEdits);
    const shared = new Map<string, number>();
    for (const g of new Set(grams)) {
      for (const candidate of this.byTrigram.get(g) ?? []) {
        shared.set(candidate, (shared.get(candidate) ?? 0) + 1);
      }
    }
    const matches: FuzzyMatch[] = [];
    for (const [candidate, count] of shared) {
      if (count < needed || candidate === term) continue;
      const distance = editDistance(term, candidate, maxEdits);
      if (distance <= maxEdits) matches.push({ term: candidate, distance });
    }
    const last = term[term.length - 1];
    matches.sort(
      (a, b) =>
        a.distance - b.distance ||
        Number(b.term.endsWith(last!)) - Number(a.term.endsWith(last!)) ||
        (this.frequency.get(b.term) ?? 0) - (this.frequency.get(a.term) ?? 0) ||
        a.term.localeCompare(b.term),
    );
    return matches.slice(0, limit);
  }
}
