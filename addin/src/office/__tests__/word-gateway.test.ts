import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ParagraphChangedError, TrackedChangesUnsupportedError } from '../types';
import { createWordGateway } from '../word-gateway';

const LONG = `${Array.from({ length: 70 }, (_, i) => `w${i}`).join(' ')}.`;

/** A small fake of the parts of the Word object model the gateway uses. It logs what it was asked to do. */
class FakeWord {
  changeTrackingMode = 'Off';
  selectionIndex = 0;
  failInsert = false;
  readonly log: string[] = [];
  readonly paragraphs: FakeParagraph[];

  constructor(texts: string[]) {
    this.paragraphs = texts.map((text, id) => new FakeParagraph(this, id, text));
  }

  context() {
    const setMode = (mode: string) => {
      this.log.push(`tracking:${mode}`);
      this.changeTrackingMode = mode;
    };
    const getMode = () => this.changeTrackingMode;
    return {
      sync: async () => undefined,
      document: {
        body: { paragraphs: { items: this.paragraphs, load: () => undefined } },
        load: () => undefined,
        getSelection: () => ({
          paragraphs: { getFirst: () => this.paragraphs[this.selectionIndex] },
        }),
        get changeTrackingMode() {
          return getMode();
        },
        set changeTrackingMode(mode: string) {
          setMode(mode);
        },
      },
    };
  }

  text(index: number) {
    return this.paragraphs[index]?.text;
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
    const needle = query.replace(/\^\^/g, '^');
    const start = this.text.indexOf(needle);
    return {
      getFirstOrNullObject: () =>
        start < 0
          ? new FakeRange(this, 0, 0, true)
          : new FakeRange(this, start, start + needle.length),
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
    const { log } = this.paragraph.word;
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
    return { value: other.paragraph.id === this.paragraph.id ? 'Equal' : 'Before' };
  }

  insertText(text: string) {
    const { word } = this.paragraph;
    if (word.failInsert) throw new Error('insert failed');
    word.log.push(`insert(${word.changeTrackingMode}):${text}`);
    this.paragraph.text = text;
  }
}

let fake: FakeWord;
let trackedChangesSupported: boolean;

beforeEach(() => {
  trackedChangesSupported = true;
  fake = new FakeWord([
    'Title',
    'The rent is due monthly. Prior to the start, sign the lease.',
    'Same text.',
    'Same text.',
    `Intro. ${LONG}`,
  ]);
  vi.stubGlobal('Word', { run: <T>(fn: (context: unknown) => Promise<T>) => fn(fake.context()) });
  vi.stubGlobal('Office', {
    context: { requirements: { isSetSupported: () => trackedChangesSupported } },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createWordGateway', () => {
  it('reads paragraph texts in order', async () => {
    expect(await createWordGateway().readParagraphs()).toEqual(fake.paragraphs.map((p) => p.text));
  });

  it.each([
    ['a short sentence', 1, 'Prior to the start, sign the lease.'],
    ['a sentence too long for one search', 4, LONG],
  ])('selects %s', async (_name, paragraphIndex, text) => {
    const found = await createWordGateway().selectSentence({ paragraphIndex, text });

    expect(found).toBe(true);
    expect(fake.log).toEqual([`select:${text}`]);
  });

  it.each([
    ['the text is gone', 1, 'Not here.'],
    ['the paragraph is gone', 9, 'Title'],
  ])('does not select when %s', async (_name, paragraphIndex, text) => {
    expect(await createWordGateway().selectSentence({ paragraphIndex, text })).toBe(false);
  });

  it('sets and clears highlights and counts the sentences it found', async () => {
    const gateway = createWordGateway();
    const refs = [
      { paragraphIndex: 1, text: 'The rent is due monthly.' },
      { paragraphIndex: 1, text: 'Missing.' },
    ];

    const counts = [
      await gateway.highlightSentences(refs, 'Yellow'),
      await gateway.highlightSentences(refs, null),
    ];

    expect(counts).toEqual([1, 1]);
    expect(fake.log).toEqual([
      'highlight:Yellow:The rent is due monthly.',
      'highlight:null:The rent is due monthly.',
    ]);
  });

  it.each([
    ['a unique paragraph', 1],
    ['the second of two identical paragraphs', 3],
  ])('finds the selected paragraph when it is %s', async (_name, index) => {
    fake.selectionIndex = index;

    expect(await createWordGateway().getSelectedParagraph()).toEqual({
      index,
      text: fake.text(index),
    });
  });

  it.each(['Off', 'TrackMineOnly'])(
    'inserts the rewrite with tracking on, then restores %s',
    async (previousMode) => {
      fake.changeTrackingMode = previousMode;

      await createWordGateway().replaceParagraphAsTrackedChange(
        { index: 0, text: 'Title' },
        'New title',
      );

      expect(fake.log).toEqual([
        'tracking:TrackAll',
        'insert(TrackAll):New title',
        `tracking:${previousMode}`,
      ]);
      expect(fake.text(0)).toBe('New title');
    },
  );

  it('restores tracking when the insert fails', async () => {
    fake.failInsert = true;

    await expect(
      createWordGateway().replaceParagraphAsTrackedChange({ index: 0, text: 'Title' }, 'New'),
    ).rejects.toThrow('insert failed');
    expect(fake.changeTrackingMode).toBe('Off');
  });

  it('refuses to overwrite a paragraph that changed after the rewrite was requested', async () => {
    await expect(
      createWordGateway().replaceParagraphAsTrackedChange({ index: 0, text: 'Old title' }, 'New'),
    ).rejects.toBeInstanceOf(ParagraphChangedError);
    expect(fake.log).toEqual([]);
  });

  it('refuses to insert when Word lacks WordApi 1.4', async () => {
    trackedChangesSupported = false;

    await expect(
      createWordGateway().replaceParagraphAsTrackedChange({ index: 0, text: 'Title' }, 'New'),
    ).rejects.toBeInstanceOf(TrackedChangesUnsupportedError);
  });
});
