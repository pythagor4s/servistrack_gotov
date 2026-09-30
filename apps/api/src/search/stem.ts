const SUFFIXES = [
  "ovanjem",
  "evanjem",
  "ovanje",
  "ovanja",
  "ovanju",
  "evanje",
  "evanja",
  "evanju",
  "anjem",
  "enjem",
  "ujejo",
  "ujemo",
  "ujete",
  "anje",
  "anja",
  "anju",
  "enje",
  "enja",
  "enju",
  "itev",
  "itve",
  "itvi",
  "uje",
  "ajo",
  "ejo",
  "ijo",
  "amo",
  "emo",
  "imo",
  "ate",
  "ete",
  "ite",
  "ati",
  "eti",
  "iti",
  "ega",
  "emu",
  "ima",
  "imi",
  "ami",
  "ema",
  "ena",
  "eno",
  "ene",
  "eni",
  "ih",
  "ah",
  "eh",
  "om",
  "em",
  "im",
  "ov",
  "ev",
  "mi",
  "en",
  "a",
  "e",
  "i",
  "o",
  "u",
];

const MIN_STEM = 3;
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

export function stem(word: string): string {
  if (word.length <= MIN_STEM) return word;
  for (const suffix of SUFFIXES) {
    if (word.length - suffix.length >= MIN_STEM && word.endsWith(suffix)) {
      return dropInsertedJ(word.slice(0, -suffix.length));
    }
  }
  return word;
}

function dropInsertedJ(root: string): string {
  if (root.length > 3 && root.endsWith("j") && !VOWELS.has(root[root.length - 2]!)) {
    return root.slice(0, -1);
  }
  return root;
}
