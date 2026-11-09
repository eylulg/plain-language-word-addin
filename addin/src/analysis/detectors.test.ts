import { describe, expect, it } from "vitest";
import {
  findFillers,
  findJargon,
  findLongSentence,
  findNominalisations,
  findPassiveVoice,
} from "./detectors";

describe("findLongSentence", () => {
  const sentence = (n: number) => Array.from({ length: n }, () => "word").join(" ") + ".";

  it("flags sentences over the limit only", () => {
    expect(findLongSentence(sentence(25), 25)).toEqual([]);
    expect(findLongSentence(sentence(26), 25)).toHaveLength(1);
    expect(findLongSentence(sentence(26), 25)[0]?.message).toBe("26 words. Aim for 25 or fewer.");
  });
});

describe("findPassiveVoice", () => {
  const matches = (s: string) => findPassiveVoice(s).map((f) => f.match);

  it("finds regular and irregular passives", () => {
    expect(matches("The form was signed by the tenant.")).toEqual(["was signed"]);
    expect(matches("Mistakes were made.")).toEqual(["were made"]);
  });

  it("allows adverbs between the verb and the participle", () => {
    expect(matches("The keys were not returned.")).toEqual(["were not returned"]);
    expect(matches("Fees are already paid.")).toEqual(["are already paid"]);
  });

  it("ignores adjectives and active sentences", () => {
    expect(matches("She is interested.")).toEqual([]);
    expect(matches("The tenant signed the form.")).toEqual([]);
    expect(matches("There were seven of them.")).toEqual([]);
  });

  it("suggests naming the actor when 'by' follows", () => {
    expect(findPassiveVoice("It was paid by the bank.")[0]?.suggestion).toContain("by");
  });
});

describe("findNominalisations", () => {
  it("suggests a verb for known nominalisations", () => {
    const [finding] = findNominalisations("We will make a decision soon.");
    expect(finding).toMatchObject({ match: "decision", suggestion: 'Try the verb "decide".' });
  });

  it("uses the suffix rule for unknown ones and skips common words", () => {
    expect(findNominalisations("The categorisation was slow.").map((f) => f.match)).toEqual([
      "categorisation",
    ]);
    expect(findNominalisations("The government sent information.")).toEqual([]);
  });

  it("reports each word once per sentence", () => {
    expect(findNominalisations("Payment, payment and more payment.")).toHaveLength(1);
  });
});

describe("findJargon", () => {
  it("matches multi-word phrases case-insensitively with suggestions", () => {
    const findings = findJargon("In the event that you leave, return the keys prior to Friday.");
    expect(findings.map((f) => f.match)).toEqual(["In the event that", "prior to"]);
    expect(findings[1]?.suggestion).toBe('Try "before".');
  });

  it("does not match inside other words", () => {
    expect(findJargon("The deemster spoke.")).toEqual([]);
  });
});

describe("findFillers", () => {
  it("finds filler words and phrases", () => {
    expect(findFillers("It should be noted that this is really very simple.").map((f) => f.match)).toEqual([
      "It should be noted that",
      "really",
      "very",
    ]);
  });
});
