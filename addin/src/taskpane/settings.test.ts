import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, parseProtectedTerms } from "./settings";

beforeEach(() => localStorage.clear());

describe("settings", () => {
  it("parses protected terms from lines and commas, without duplicates", () => {
    expect(parseProtectedTerms("Landlord\n Schedule 2 ,Landlord\n\n")).toEqual(["Landlord", "Schedule 2"]);
  });

  it("falls back to defaults for missing or invalid stored values", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem(
      "plain-language:settings",
      JSON.stringify({ targetGrade: 99, tone: "angry", model: "x" }),
    );
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem("plain-language:settings", "{not json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("loads valid stored values", () => {
    localStorage.setItem(
      "plain-language:settings",
      JSON.stringify({ targetGrade: 6, tone: "formal", model: "claude-opus-5-5", protectedTerms: "Tenant" }),
    );
    expect(loadSettings()).toEqual({
      targetGrade: 6,
      tone: "formal",
      model: "claude-opus-5-5",
      protectedTerms: "Tenant",
    });
  });
});
