import { describe, expect, it } from "vitest";
import {
  ABBREVIATIONS,
  LIST_ITEMS,
  MANUAL_LINE_BREAKS,
  NUMBERS,
  PLAIN,
  QUOTES,
} from "./__fixtures__/paragraphs";
import { splitSentences } from "./sentences";

const texts = (paragraph: string) => splitSentences(paragraph).map((s) => s.text);

describe("splitSentences", () => {
  it("splits plain sentences", () => {
    expect(texts(PLAIN)).toEqual([
      "We will send your card in the post.",
      "It should arrive within five days.",
      "Call us if it does not.",
    ]);
  });

  it("does not split after abbreviations or initials", () => {
    expect(texts(ABBREVIATIONS)).toEqual([
      "Mr. Lee met Dr. Okafor at 9 a.m. on Jan. 5.",
      "They signed the lease, e.g. the long one.",
      "It worked.",
    ]);
    expect(texts("J. K. Rowling wrote it. Then she rested.")).toEqual([
      "J. K. Rowling wrote it.",
      "Then she rested.",
    ]);
  });

  it("keeps decimals, money, percentages and version numbers together", () => {
    expect(texts(NUMBERS)).toEqual([
      "The fee rose from $1,250.50 to $1,300 in 2025.",
      "That is a 4% rise.",
      "Version 3.2.1 fixed it.",
    ]);
  });

  it("keeps closing quotes with their sentence", () => {
    expect(texts(QUOTES)).toEqual([
      '"Stop."',
      "She waited.",
      '"Will you sign?" he asked.',
      "She said “yes.”",
      "Then she left.",
    ]);
  });

  it("strips list markers and accepts items without a full stop", () => {
    expect(LIST_ITEMS.flatMap(texts)).toEqual([
      "Read the form.",
      "Sign it",
      "Send it back by Friday.",
      "Keep a copy.",
      "Ask us if unsure",
    ]);
  });

  it("treats manual line breaks as sentence boundaries", () => {
    expect(texts(MANUAL_LINE_BREAKS)).toEqual([
      "Name: Ada Lovelace",
      "Address: 1 Main Street",
      "The form is complete.",
    ]);
  });

  it("handles ellipses, question marks and exclamations", () => {
    expect(texts("Wait... Is it done? Yes! Good.")).toEqual(["Wait...", "Is it done?", "Yes!", "Good."]);
  });

  it("returns offsets that point back into the paragraph", () => {
    const paragraph = "  First one.   Second one.  ";
    for (const sentence of splitSentences(paragraph)) {
      expect(paragraph.slice(sentence.start, sentence.end)).toBe(sentence.text);
    }
  });

  it("returns nothing for empty or punctuation-only paragraphs", () => {
    expect(splitSentences("")).toEqual([]);
    expect(splitSentences("   ")).toEqual([]);
    expect(splitSentences("...")).toEqual([]);
  });
});
