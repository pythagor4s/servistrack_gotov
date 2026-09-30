import type { ReactNode } from "react";

import type { KbHitMatch, KbRange } from "@/lib/types";

export const MARK = "rounded-[3px] bg-search-hit px-px text-search-hit-foreground";

export function Highlight({ text, ranges }: { text: string; ranges: KbRange[] }) {
  if (ranges.length === 0) return <>{text}</>;
  const parts: ReactNode[] = [];
  let at = 0;
  ranges.forEach(([from, to], i) => {
    if (from > at) parts.push(text.slice(at, from));
    parts.push(
      <mark key={i} className={MARK}>
        {text.slice(from, to)}
      </mark>,
    );
    at = to;
  });
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}

export function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}+/gu, "").replace(/đ/g, "d");
}

export function markPrefixes(matched: readonly KbHitMatch[]): string[] {
  const out = new Set<string>();
  for (const m of matched) {
    for (const word of [m.as, m.term]) {
      const f = fold(word).replace(/[-_./]/g, "");
      if (f.length < 3) continue;
      out.add(f.length <= 4 ? f.slice(0, Math.max(3, f.length - 1)) : f.slice(0, Math.max(4, f.length - 2)));
    }
  }
  return [...out];
}

type HNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
};

const WORD = /[\p{L}\p{N}]+/gu;

function splitText(value: string, prefixes: readonly string[]): HNode[] {
  const out: HNode[] = [];
  let at = 0;
  for (const m of value.matchAll(WORD)) {
    const folded = fold(m[0]);
    if (!prefixes.some((p) => folded.startsWith(p))) continue;
    if (m.index > at) out.push({ type: "text", value: value.slice(at, m.index) });
    out.push({
      type: "element",
      tagName: "mark",
      properties: {},
      children: [{ type: "text", value: m[0] }],
    });
    at = m.index + m[0].length;
  }
  if (at === 0) return [{ type: "text", value }];
  if (at < value.length) out.push({ type: "text", value: value.slice(at) });
  return out;
}

function walk(node: HNode, prefixes: readonly string[]) {
  if (!node.children) return;
  const next: HNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value) next.push(...splitText(child.value, prefixes));
    else {
      walk(child, prefixes);
      next.push(child);
    }
  }
  node.children = next;
}

export function rehypeMark(prefixes: readonly string[]) {
  return () => (tree: HNode) => {
    if (prefixes.length > 0) walk(tree, prefixes);
  };
}

export function headingSlug(text: string): string {
  return fold(text).replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "razdelek";
}

function textOf(node: HNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

export function rehypeHeadingIds() {
  return (tree: HNode) => {
    const seen = new Map<string, number>();
    const visit = (node: HNode) => {
      if (node.type === "element" && /^h[2-4]$/.test(node.tagName ?? "")) {
        const base = headingSlug(textOf(node));
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        node.properties = { ...node.properties, id: n > 1 ? `${base}-${n}` : base };
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
