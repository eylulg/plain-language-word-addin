import { describe, expect, it } from "vitest";
import { LEGALESE, PLAIN } from "@/test-utils/paragraphs";
import { analyzeDocument, analyzeParagraph } from "../analyze";

describe("analyzeParagraph", () => {
  it("scores a plain paragraph as easy with no issues", () => {
    const result = analyzeParagraph(PLAIN, 0);

    expect(result.issues).toEqual([]);
    expect(result.stats.gradeLevel).toBeLessThan(5);
  });

  it("finds each kind of problem in legalese and points every issue at its sentence", () => {
    const result = analyzeParagraph(LEGALESE, 3);

    expect(new Set(result.issues.map((i) => i.type))).toEqual(
      new Set(["long-sentence", "passive-voice", "nominalisation", "jargon"]),
    );
    expect(result.stats.gradeLevel).toBeGreaterThan(14);
    expect(result.issues.every((i) => i.paragraphIndex === 3 && LEGALESE.includes(i.sentence))).toBe(true);
  });

  it("does not report a jargon word again as a nominalisation", () => {
    const result = analyzeParagraph("Notice is required prior to the commencement of works.", 0);

    expect(result.issues.filter((i) => i.match === "commencement").map((i) => i.type)).toEqual(["jargon"]);
  });

  it("gives every issue a unique id", () => {
    const ids = analyzeParagraph(LEGALESE, 0).issues.map((i) => i.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("analyzeDocument", () => {
  it("scores all sentences together and keeps the original paragraph indexes", () => {
    const doc = analyzeDocument([PLAIN, "", LEGALESE]);

    expect(doc.paragraphs.map((p) => p.index)).toEqual([0, 2]);
    expect(doc.stats.sentences).toBe(4);
    expect(doc.issueCounts["long-sentence"]).toBe(1);
  });

  it("returns zero counts for an empty document", () => {
    const doc = analyzeDocument([]);

    expect(doc.stats.words).toBe(0);
    expect(Object.values(doc.issueCounts)).toEqual([0, 0, 0, 0, 0]);
  });
});
