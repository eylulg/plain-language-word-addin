import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParagraphChangedError, TrackedChangesUnsupportedError } from "./types";
import { createWordGateway } from "./word-gateway";

/**
 * A tiny fake of the parts of the Word object model the gateway uses.
 * It records what the gateway did so tests can assert on it.
 */
class FakeWord {
  changeTrackingMode = "Off";
  readonly log: string[] = [];
  readonly paragraphs: FakeParagraph[];
  selectionIndex = 0;
  failInsert = false;

  constructor(texts: string[]) {
    this.paragraphs = texts.map((text, id) => new FakeParagraph(this, id, text));
  }

  context() {
    const document = {
      body: { paragraphs: { items: this.paragraphs, load: () => undefined } },
      load: () => undefined,
      getSelection: () => ({ paragraphs: { getFirst: () => this.paragraphs[this.selectionIndex] } }),
    };
    Object.defineProperty(document, "changeTrackingMode", {
      get: () => this.changeTrackingMode,
      set: (mode: string) => {
        this.log.push(`tracking:${mode}`);
        this.changeTrackingMode = mode;
      },
    });
    return { document, sync: vi.fn(async () => undefined) };
  }
}

class FakeParagraph {
  constructor(
    readonly word: FakeWord,
    readonly id: number,
    public text: string,
  ) {}

  load() {
    return this;
  }

  search(query: string) {
    const needle = query.replace(/\^\^/g, "^");
    const start = this.text.indexOf(needle);
    return {
      getFirstOrNullObject: () =>
        start < 0 ? new FakeRange(this, 0, 0, true) : new FakeRange(this, start, start + needle.length),
    };
  }

  getRange() {
    return new FakeRange(this, 0, this.text.length);
  }
}

class FakeRange {
  constructor(
    readonly paragraph: FakeParagraph,
    readonly start: number,
    readonly end: number,
    readonly isNullObject = false,
  ) {}

  get text() {
    return this.paragraph.text.slice(this.start, this.end);
  }

  get font() {
    const log = this.paragraph.word.log;
    const text = this.text;
    return {
      set highlightColor(color: string | null) {
        log.push(`highlight:${color}:${text}`);
      },
    };
  }

  load() {
    return this;
  }

  select() {
    this.paragraph.word.log.push(`select:${this.text}`);
  }

  expandTo(other: FakeRange) {
    return new FakeRange(this.paragraph, this.start, other.end);
  }

  compareLocationWith(other: FakeRange) {
    return { value: other.paragraph.id === this.paragraph.id ? "Equal" : "Before" };
  }

  insertText(text: string) {
    const word = this.paragraph.word;
    if (word.failInsert) throw new Error("insert failed");
    word.log.push(`insert(${word.changeTrackingMode}):${text}`);
    this.paragraph.text = text;
  }
}

let fake: FakeWord;
let tracked = true;

beforeEach(() => {
  tracked = true;
  fake = new FakeWord([
    "Title",
    "The rent is due monthly. Prior to the start, sign the lease.",
    "Same text.",
    "Same text.",
  ]);
  vi.stubGlobal("Word", { run: <T>(fn: (context: unknown) => Promise<T>) => fn(fake.context()) });
  vi.stubGlobal("Office", { context: { requirements: { isSetSupported: () => tracked } } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createWordGateway", () => {
  it("reads paragraph texts in order", async () => {
    expect(await createWordGateway().readParagraphs()).toEqual(fake.paragraphs.map((p) => p.text));
  });

  it("selects a sentence inside its paragraph", async () => {
    const found = await createWordGateway().selectSentence({
      paragraphIndex: 1,
      text: "Prior to the start, sign the lease.",
    });
    expect(found).toBe(true);
    expect(fake.log).toEqual(["select:Prior to the start, sign the lease."]);
  });

  it("selects long sentences by expanding from the head to the tail", async () => {
    const long = Array.from({ length: 70 }, (_, i) => `w${i}`).join(" ") + ".";
    fake.paragraphs[1]!.text = `Intro. ${long}`;
    expect(await createWordGateway().selectSentence({ paragraphIndex: 1, text: long })).toBe(true);
    expect(fake.log).toEqual([`select:${long}`]);
  });

  it("returns false when the sentence is gone", async () => {
    expect(await createWordGateway().selectSentence({ paragraphIndex: 1, text: "Not here." })).toBe(false);
    expect(await createWordGateway().selectSentence({ paragraphIndex: 9, text: "Title" })).toBe(false);
  });

  it("sets and clears highlights and counts what it found", async () => {
    const gateway = createWordGateway();
    const refs = [
      { paragraphIndex: 1, text: "The rent is due monthly." },
      { paragraphIndex: 1, text: "Missing." },
    ];
    expect(await gateway.highlightSentences(refs, "Yellow")).toBe(1);
    expect(await gateway.highlightSentences(refs, null)).toBe(1);
    expect(fake.log).toEqual([
      "highlight:Yellow:The rent is due monthly.",
      "highlight:null:The rent is due monthly.",
    ]);
  });

  it("finds the selected paragraph, also when its text appears twice", async () => {
    const gateway = createWordGateway();
    fake.selectionIndex = 1;
    expect(await gateway.getSelectedParagraph()).toEqual({ index: 1, text: fake.paragraphs[1]!.text });
    fake.selectionIndex = 3;
    expect(await gateway.getSelectedParagraph()).toEqual({ index: 3, text: "Same text." });
  });

  it("inserts the rewrite with tracking on, then restores the previous mode", async () => {
    const original = fake.paragraphs[1]!.text;
    await createWordGateway().replaceParagraphAsTrackedChange(
      { index: 1, text: original },
      "Pay rent each month.",
    );
    expect(fake.log).toEqual(["tracking:TrackAll", "insert(TrackAll):Pay rent each month.", "tracking:Off"]);
    expect(fake.paragraphs[1]!.text).toBe("Pay rent each month.");
  });

  it("keeps the author's tracking mode when it was already on", async () => {
    fake.changeTrackingMode = "TrackMineOnly";
    await createWordGateway().replaceParagraphAsTrackedChange({ index: 0, text: "Title" }, "New title");
    expect(fake.log.at(-1)).toBe("tracking:TrackMineOnly");
  });

  it("restores tracking even when the insert fails", async () => {
    fake.failInsert = true;
    await expect(
      createWordGateway().replaceParagraphAsTrackedChange({ index: 0, text: "Title" }, "New"),
    ).rejects.toThrow("insert failed");
    expect(fake.changeTrackingMode).toBe("Off");
  });

  it("refuses to overwrite a paragraph that changed since the rewrite", async () => {
    await expect(
      createWordGateway().replaceParagraphAsTrackedChange({ index: 0, text: "Old title" }, "New"),
    ).rejects.toBeInstanceOf(ParagraphChangedError);
    expect(fake.log).toEqual([]);
  });

  it("explains when WordApi 1.4 is missing", async () => {
    tracked = false;
    await expect(
      createWordGateway().replaceParagraphAsTrackedChange({ index: 0, text: "Title" }, "New"),
    ).rejects.toBeInstanceOf(TrackedChangesUnsupportedError);
  });
});
