import { describe, expect, it } from "vitest";
import { tokenizeWords } from "../words";

describe("tokenizeWords", () => {
  it("keeps contractions, hyphenated words, money and percentages whole", () => {
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
