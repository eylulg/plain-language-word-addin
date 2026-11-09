import { describe, expect, it } from "vitest";
import { fleschKincaidGrade, fleschReadingEase, readabilityLabel } from "./readability";

describe("Flesch formulas", () => {
  // 100 words, 5 sentences, 130 syllables: a textbook example.
  it("computes reading ease", () => {
    expect(fleschReadingEase(100, 5, 130)).toBeCloseTo(206.835 - 1.015 * 20 - 84.6 * 1.3, 5);
  });

  it("computes the Flesch-Kincaid grade", () => {
    expect(fleschKincaidGrade(100, 5, 130)).toBeCloseTo(0.39 * 20 + 11.8 * 1.3 - 15.59, 5);
  });

  it("returns 0 for empty text instead of dividing by zero", () => {
    expect(fleschReadingEase(0, 0, 0)).toBe(0);
    expect(fleschKincaidGrade(0, 0, 0)).toBe(0);
  });

  it.each([
    [95, "Very easy"],
    [65, "Plain English"],
    [45, "Difficult"],
    [10, "Very difficult"],
  ] as const)("labels %i as %s", (ease, label) => {
    expect(readabilityLabel(ease)).toBe(label);
  });
});
