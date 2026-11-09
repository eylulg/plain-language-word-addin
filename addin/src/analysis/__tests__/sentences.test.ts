import { describe, expect, it } from "vitest";
import {
  ABBREVIATIONS,
  LIST_ITEMS,
  MANUAL_LINE_BREAKS,
  NUMBERS,
  PLAIN,
  QUOTES,
} from "@/test-utils/paragraphs";
import { splitSentences } from "../sentences";

const texts = (paragraph: string) => splitSentences(paragraph).map((s) => s.text);

describe("splitSentences", () => {
  it.each([
    [
      "plain sentences",
      PLAIN,
      [
        "We will send your card in the post.",
        "It should arrive within five days.",
        "Call us if it does not.",
      ],
    ],
    [
      "abbreviations",
      ABBREVIATIONS,
      [
        "Mr. Lee met Dr. Okafor at 9 a.m. on Jan. 5.",
        "They signed the lease, e.g. the long one.",
        "It worked.",
      ],
    ],
    ["initials", "J. K. Rowling wrote it. Then she rested.", ["J. K. Rowling wrote it.", "Then she rested."]],
    [
      "decimals, money, percentages and versions",
      NUMBERS,
      ["The fee rose from $1,250.50 to $1,300 in 2025.", "That is a 4% rise.", "Version 3.2.1 fixed it."],
    ],
    [
      "closing quotes after the full stop",
      QUOTES,
      ['"Stop."', "She waited.", '"Will you sign?" he asked.', "She said “yes.”", "Then she left."],
    ],
    [
      "manual line breaks",
      MANUAL_LINE_BREAKS,
      ["Name: Ada Lovelace", "Address: 1 Main Street", "The form is complete."],
    ],
    [
      "ellipses, questions and exclamations",
      "Wait... Is it done? Yes! Good.",
      ["Wait...", "Is it done?", "Yes!", "Good."],
    ],
    ["an empty paragraph", "   ", []],
    ["punctuation only", "...", []],
  ])("splits %s", (_name, paragraph, expected) => {
    expect(texts(paragraph)).toEqual(expected);
  });

  it("strips list markers and keeps items without a full stop", () => {
    expect(LIST_ITEMS.flatMap(texts)).toEqual([
      "Read the form.",
      "Sign it",
      "Send it back by Friday.",
      "Keep a copy.",
      "Ask us if unsure",
    ]);
  });

  it("returns offsets that point back into the paragraph", () => {
    const paragraph = "  First one.   Second one.  ";

    const sentences = splitSentences(paragraph);

    expect(sentences.map((s) => paragraph.slice(s.start, s.end))).toEqual(["First one.", "Second one."]);
  });
});
