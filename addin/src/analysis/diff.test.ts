import { describe, expect, it } from "vitest";
import { diffWords } from "./diff";

describe("diffWords", () => {
  it("returns a single equal part for identical text", () => {
    expect(diffWords("Sign the form.", "Sign the form.")).toEqual([{ op: "equal", text: "Sign the form." }]);
  });

  it("marks replaced words as delete then insert", () => {
    const parts = diffWords("Return it prior to Friday.", "Return it before Friday.");
    expect(parts.filter((p) => p.op !== "equal")).toEqual([
      { op: "delete", text: "prior to" },
      { op: "insert", text: "before" },
    ]);
  });

  it("rebuilds both sides losslessly", () => {
    const before = "In the event that you leave, return the keys.";
    const after = "If you leave, return the keys to us.";
    const parts = diffWords(before, after);
    expect(
      parts
        .filter((p) => p.op !== "insert")
        .map((p) => p.text)
        .join(""),
    ).toBe(before);
    expect(
      parts
        .filter((p) => p.op !== "delete")
        .map((p) => p.text)
        .join(""),
    ).toBe(after);
  });

  it("handles empty input", () => {
    expect(diffWords("", "New text")).toEqual([{ op: "insert", text: "New text" }]);
    expect(diffWords("Old", "")).toEqual([{ op: "delete", text: "Old" }]);
  });
});
