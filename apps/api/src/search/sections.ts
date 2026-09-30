import { stripMarkdown } from "@servis-track/shared";

const CAUSE_HEADING = /^(vzrok|ugotovitev|ugotovitev serviserja|diagnostika|diagnoza|kaj je bilo narobe)\b/i;
const HEADING = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;

export interface MarkdownSection {
  heading: string | null;
  text: string;
}

export function splitSections(md: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection = { heading: null, text: "" };
  for (const line of md.split(/\r?\n/)) {
    const h = HEADING.exec(line);
    if (h) {
      if (current.heading !== null || current.text.trim()) sections.push(current);
      current = { heading: h[2]!.trim(), text: "" };
    } else {
      current.text += `${line}\n`;
    }
  }
  if (current.heading !== null || current.text.trim()) sections.push(current);
  return sections;
}

export function causeSection(md: string): string | null {
  const section = splitSections(md).find((s) => s.heading && CAUSE_HEADING.test(s.heading));
  const text = section ? stripMarkdown(section.text).replace(/\s+/g, " ").trim() : "";
  return text || null;
}

export function causeSummary(md: string, max = 600): string {
  const cause = causeSection(md);
  const source =
    cause ??
    stripMarkdown(
      splitSections(md)
        .map((s) => s.text)
        .find((t) => t.trim()) ?? md,
    )
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)[0] ??
    "";
  return clip(source.replace(/\s+/g, " ").trim(), max);
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sentence = cut.lastIndexOf(". ");
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  const space = cut.lastIndexOf(" ");
  return cut.slice(0, space > 0 ? space : max);
}
