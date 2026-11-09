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
});
