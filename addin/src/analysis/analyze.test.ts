import { describe, expect, it } from "vitest";
import { LEGALESE, PLAIN } from "./__fixtures__/paragraphs";
import { analyzeDocument, analyzeParagraph } from "./analyze";

describe("analyzeParagraph", () => {
  it("scores a plain paragraph as easy with no issues", () => {
    const result = analyzeParagraph(PLAIN, 0);
    expect(result.sentences).toHaveLength(3);
    expect(result.issues).toEqual([]);
    expect(result.stats.gradeLevel).toBeLessThan(5);
    expect(result.stats.readingEase).toBeGreaterThan(80);
  });

  it("finds every issue type in legalese", () => {
    const result = analyzeParagraph(LEGALESE, 3);
    const types = new Set(result.issues.map((i) => i.type));
    expect(types).toEqual(new Set(["long-sentence", "passive-voice", "nominalisation", "jargon"]));
    expect(result.stats.gradeLevel).toBeGreaterThan(14);
    for (const issue of result.issues) {
      expect(issue.paragraphIndex).toBe(3);
      expect(LEGALESE).toContain(issue.sentence);
    }
  });

  it("does not report a jargon word again as a nominalisation", () => {
    const result = analyzeParagraph("Notice is required prior to the commencement of works.", 0);
    expect(result.issues.filter((i) => i.match === "commencement").map((i) => i.type)).toEqual(["jargon"]);
  });

  it("honours a custom long sentence limit", () => {
    const result = analyzeParagraph(PLAIN, 0, { longSentenceWords: 5 });
    expect(result.issues.filter((i) => i.type === "long-sentence")).toHaveLength(3);
  });

  it("gives every issue a unique id", () => {
    const ids = analyzeParagraph(LEGALESE, 0).issues.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("analyzeDocument", () => {
  it("aggregates over all sentences and keeps original paragraph indexes", () => {
    const doc = analyzeDocument([PLAIN, "", LEGALESE]);
    expect(doc.paragraphs.map((p) => p.index)).toEqual([0, 2]);
    expect(doc.stats.sentences).toBe(4);
    expect(doc.issueCounts["long-sentence"]).toBe(1);
    expect(doc.issues.every((i) => i.paragraphIndex === 2)).toBe(true);
  });

  it("returns a zeroed result for an empty document", () => {
    const doc = analyzeDocument([]);
    expect(doc.stats.words).toBe(0);
    expect(doc.issues).toEqual([]);
    expect(doc.issueCounts).toEqual({
      "long-sentence": 0,
      "passive-voice": 0,
      nominalisation: 0,
      jargon: 0,
      filler: 0,
    });
  });
});
