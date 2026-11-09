import { describe, expect, it } from "vitest";
import { countSyllables } from "../syllables";

describe("countSyllables", () => {
  it.each([
    ["cat", 1],
    ["make", 1],
    ["table", 2],
    ["reading", 2],
    ["beautiful", 3],
    ["agreement", 3],
    ["documentation", 5],
    ["people", 2],
    ["5", 1],
    ["2025", 4],
    ["1,250,000", 4],
    ["--", 0],
  ])("counts %s as %i", (word, expected) => {
    expect(countSyllables(word)).toBe(expected);
  });
});
