import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, parseProtectedTerms } from "../settings";

const KEY = "plain-language:settings";

beforeEach(() => {
  localStorage.clear();
});

describe("parseProtectedTerms", () => {
  it("splits on lines and commas, trims and drops duplicates", () => {
    expect(parseProtectedTerms("Landlord\n Schedule 2 ,Landlord\n\n")).toEqual(["Landlord", "Schedule 2"]);
  });
});

describe("loadSettings", () => {
  it.each([
    ["nothing stored", null, DEFAULT_SETTINGS],
    ["broken JSON", "{not json", DEFAULT_SETTINGS],
    ["all invalid values", JSON.stringify({ targetGrade: 99, tone: "angry", model: "x" }), DEFAULT_SETTINGS],
    [
      "one invalid value",
      JSON.stringify({ ...DEFAULT_SETTINGS, targetGrade: 6, tone: "angry" }),
      { ...DEFAULT_SETTINGS, targetGrade: 6 },
    ],
    [
      "valid values",
      JSON.stringify({ targetGrade: 6, tone: "formal", model: "claude-opus-5-5", protectedTerms: "Tenant" }),
      { targetGrade: 6, tone: "formal", model: "claude-opus-5-5", protectedTerms: "Tenant" },
    ],
  ])("loads %s", (_name, stored, expected) => {
    if (stored !== null) localStorage.setItem(KEY, stored);

    expect(loadSettings()).toEqual(expected);
  });
});
