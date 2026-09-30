import { describe, expect, it } from "vitest";
import { fold, tokenize } from "./text";
import { stem } from "./stem";

describe("fold", () => {
  it("drops case and diacritics", () => {
    expect(fold("Zamašena ČRPALKA đ")).toBe("zamasena crpalka d");
  });
});

describe("tokenize", () => {
  it("keeps offsets into the ORIGINAL text, diacritics included", () => {
    const text = "Črpalka črnila";
    const [first, second] = tokenize(text);
    expect(text.slice(first!.start, first!.end)).toBe("Črpalka");
    expect(second!.term).toBe("crnila");
    expect(second!.display).toBe("črnila");
  });

  it("indexes an error code whole and in parts, so E-042 / e042 / E 042 all meet", () => {
    const terms = tokenize("Napaka E-042").map((t) => t.term);
    expect(terms).toEqual(expect.arrayContaining(["napaka", "e042", "042"]));
    expect(tokenize("e042")[0]!.term).toBe("e042");
  });

  it("does not stem terms with digits", () => {
    expect(tokenize("EOT-1")[0]!.stem).toBe("eot1");
  });

  it("drops stopwords and one-letter words, but keeps `nas` (the network disk)", () => {
    const terms = tokenize("in se je na v NAS ne dela").map((t) => t.term);
    expect(terms).toEqual(["nas"]);
  });

  it("keeps stopwords when asked", () => {
    expect(tokenize("je na", { keepStopwords: true }).map((t) => t.term)).toEqual(["je", "na"]);
  });
});

describe("stem", () => {
  const same = (words: string[]) => new Set(words.map((w) => stem(fold(w)))).size;

  it.each([
    [["tiskalnik", "tiskalnika", "tiskalniku", "tiskalniki", "tiskalnikov", "tiskalnikom"]],
    [["glava", "glave", "glavo", "glavi", "glavah"]],
    [["podtlak", "podtlaka", "podtlaku", "podtlakom"]],
    [["rezilo", "rezila", "rezilom"]],
    [["zamašen", "zamašena", "zamašeno", "zamašene"]],
    [["šoba", "šobe", "šob", "šobah"]],
    [["stroj", "stroja", "strojem", "strojev", "stroji"]],
    [["material", "materiala", "materialom"]],
    [["senzor", "senzorja", "senzorju"]],
    [["nastavitev", "nastavitve", "nastaviti"]],
  ])("folds %j onto one root", (words) => {
    expect(same(words)).toBe(1);
  });

  it("leaves short words alone", () => {
    expect(stem("cev")).toBe("cev");
    expect(stem("tla")).toBe("tla");
  });
});
