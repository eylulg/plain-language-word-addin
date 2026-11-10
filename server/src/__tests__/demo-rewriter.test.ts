import { describe, expect, it } from "vitest";
import { createDemoRewriter, DEMO_FIXTURE } from "../demo-rewriter.js";

const base = { targetGrade: 8, tone: "neutral" as const, protectedTerms: [] };

describe("createDemoRewriter", () => {
  it("returns the hand-written fixture for the sample paragraph", async () => {
    const result = await createDemoRewriter().rewrite({ ...base, text: `  ${DEMO_FIXTURE.original}  ` });

    expect(result).toMatchObject({
      rewrite: DEMO_FIXTURE.rewrite,
      changes: DEMO_FIXTURE.changes,
      demo: true,
    });
  });

  it("swaps wordy phrases and keeps sentence capitals for other text", async () => {
    const result = await createDemoRewriter().rewrite({
      ...base,
      text: "In the event that you leave, return the keys prior to Friday. It should be noted that fees apply.",
    });

    expect(result.rewrite).toBe("If you leave, return the keys before Friday. Fees apply.");
    expect(result.changes).toContain('Replaced "prior to" with "before".');
  });

  it("rewrites a long legal sentence: swaps jargon, drops the doublet and splits it", async () => {
    const text =
      "Notwithstanding anything to the contrary contained herein, the Supplier shall indemnify and hold harmless the Customer from and against any and all losses which may be incurred by the Customer, provided that the Customer shall have given written notification of such breach within thirty (30) days of becoming aware thereof.";

    const result = await createDemoRewriter().rewrite({ ...base, text });

    expect(result.rewrite).not.toMatch(/herein|thereof|shall|any and all|thirty/i);
    expect(result.rewrite).toContain("30 days");
    expect(result.rewrite.split(/(?<=\.)\s+/).length).toBeGreaterThan(1);
    expect(result.changes).toContain("Split a long sentence in two.");
  });

  it("returns already-plain text unchanged with no changes", async () => {
    const text = "We will refund you within 14 days. The money goes back to the same card.";

    const result = await createDemoRewriter().rewrite({ ...base, text });

    expect(result).toMatchObject({ rewrite: text, changes: [] });
  });
});
