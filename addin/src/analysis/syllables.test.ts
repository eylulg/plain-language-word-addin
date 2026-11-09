import { describe, expect, it } from "vitest";
import { countSyllables } from "./syllables";
import { tokenizeWords } from "./words";

describe("countSyllables", () => {
  it.each([
    ["cat", 1],
    ["make", 1],
    ["table", 2],
    ["reading", 2],
    ["beautiful", 3],
    ["agreement", 3],
    ["documentation", 5],
    ["the", 1],
    ["people", 2],
  ])("counts %s as %i", (word, expected) => {
    expect(countSyllables(word)).toBe(expected);
  });

  it("counts numbers by digits, capped at four", () => {
    expect(countSyllables("5")).toBe(1);
    expect(countSyllables("2025")).toBe(4);
    expect(countSyllables("1,250,000")).toBe(4);
  });

  it("returns 0 for tokens without letters", () => {
    expect(countSyllables("--")).toBe(0);
  });
});

describe("tokenizeWords", () => {
  it("keeps contractions, hyphenated words and numbers whole", () => {
    expect(tokenizeWords("Don't re-sign the $1,250.50 form, it's 12% off.")).toEqual([
      "Don't",
      "re-sign",
      "the",
      "1,250.50",
      "form",
      "it's",
      "12%",
      "off",
    ]);
  });
});
