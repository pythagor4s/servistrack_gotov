import { stem } from "./stem";

export interface Token {
  term: string;
  stem: string;
  display: string;
  start: number;
  end: number;
}

export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/đ/g, "d")
    .replace(/ß/g, "ss");
}

const WORD = /[\p{L}\p{N}]+(?:[-_./][\p{L}\p{N}]+)*/gu;
const SEPARATORS = /[-_./]/g;
const HAS_DIGIT = /\p{N}/u;

export const STOPWORDS = new Set(
  (
    "a ali ampak bi bil bila bile bili bilo biti bo bodo bom bomo bos ce cez da do dokler ga " +
      "h i iz ima imam imamo imajo in ja jaz je jih jim jo ju k kaj kako kako kar kateri katera " +
      "katero kdaj kdo ker ki kje ko kot le med mi mu na nad nam naj nato ne nek neka neki " +
      "nekaj ni nic niti njega njen njihov njo o ob od on ona oni ono oz pa po pod pol potem " +
      "pred pri s sa se sem si smo so sta ste ta tako tam te tega tej tem temu ter ti tisti to " +
      "tu tudi tukaj u v vam vas vendar ves vse vsi vsak z za zakaj zato ze zelo zdaj " +
      "itd npr sto kao iz je li da se su sam smo ste ovo ono taj koji koja koje kad kada " +
      "gdje gde jer vec ima nema imamo " +
      "niso nismo prej spet znova vedno vcasih danes vceraj sedaj nekoc malo veliko precej " +
      "sploh lahko morem moremo moram mora morajo hocem zelim prosim kaksen kaksna " +
      "dela delajo deluje delujejo delal delala radi rade funkcionira stvar problem tezava " +
      "mogu moze treba " +
      "javi javil javila javilo javlja javljajo javljal javljala javljalo javljanje"
  ).split(/\s+/),
);

export function tokenize(text: string, opts: { keepStopwords?: boolean } = {}): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(WORD)) {
    const raw = m[0];
    const start = m.index;
    const folded = fold(raw);
    const hasSeparator = /[-_./]/.test(folded);
    if (hasSeparator) {
      const compound = folded.replace(SEPARATORS, "");
      push(out, compound, raw.toLowerCase(), start, start + raw.length, opts);
      let offset = 0;
      for (const part of raw.split(/([-_./])/)) {
        if (/^[-_./]$/.test(part)) {
          offset += part.length;
          continue;
        }
        push(out, fold(part), part.toLowerCase(), start + offset, start + offset + part.length, opts);
        offset += part.length;
      }
    } else {
      push(out, folded, raw.toLowerCase(), start, start + raw.length, opts);
    }
  }
  return out;
}

function push(
  out: Token[],
  term: string,
  display: string,
  start: number,
  end: number,
  opts: { keepStopwords?: boolean },
) {
  if (term.length < 2) return;
  if (!opts.keepStopwords && STOPWORDS.has(term)) return;
  out.push({ term, stem: HAS_DIGIT.test(term) ? term : stem(term), display, start, end });
}
