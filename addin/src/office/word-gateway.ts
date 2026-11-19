import { planSearch } from './search';
import type { SelectedParagraph, SentenceRef, WordGateway } from './types';
import { ParagraphChangedError, TrackedChangesUnsupportedError } from './types';

const SEARCH_OPTIONS = { matchCase: true } as const;

interface PendingRange {
  head: Word.Range;
  tail?: Word.Range;
}

/** Queues the searches for each sentence. Call context.sync() before resolving. */
function queueSearches(
  context: Word.RequestContext,
  refs: readonly SentenceRef[],
): (PendingRange | null)[] {
  const paragraphs = context.document.body.paragraphs;
  return refs.map((ref) => {
    const paragraph = paragraphs.items[ref.paragraphIndex];
    if (!paragraph) return null;
    const plan = planSearch(ref.text);
    const head = paragraph.search(plan.head, SEARCH_OPTIONS).getFirstOrNullObject();
    head.load('isNullObject');
    if (plan.tail === undefined) return { head };
    const tail = paragraph.search(plan.tail, SEARCH_OPTIONS).getFirstOrNullObject();
    tail.load('isNullObject');
    return { head, tail };
  });
}

function resolveRange(pending: PendingRange | null): Word.Range | null {
  if (!pending || pending.head.isNullObject) return null;
  if (!pending.tail) return pending.head;
  if (pending.tail.isNullObject) return null;
  return pending.head.expandTo(pending.tail);
}

async function findRanges(
  context: Word.RequestContext,
  refs: readonly SentenceRef[],
): Promise<(Word.Range | null)[]> {
  const paragraphs = context.document.body.paragraphs;
  paragraphs.load('items');
  await context.sync();
  const pending = queueSearches(context, refs);
  await context.sync();
  return pending.map(resolveRange);
}

export function createWordGateway(): WordGateway {
  return {
    kind: 'word',

    async readParagraphs() {
      return Word.run(async (context) => {
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load('items/text');
        await context.sync();
        return paragraphs.items.map((p) => p.text);
      });
    },

    async selectSentence(ref) {
      return Word.run(async (context) => {
        const [range] = await findRanges(context, [ref]);
        if (!range) return false;
        range.select('Select');
        await context.sync();
        return true;
      });
    },

    async highlightSentences(refs, color) {
      return Word.run(async (context) => {
        const ranges = await findRanges(context, refs);
        let found = 0;
        for (const range of ranges) {
          if (!range) continue;
          // Word removes the highlight when it is set to null.
          range.font.highlightColor = color as string;
          found += 1;
        }
        await context.sync();
        return found;
      });
    },

    async getSelectedParagraph(): Promise<SelectedParagraph | null> {
      return Word.run(async (context) => {
        const selected = context.document.getSelection().paragraphs.getFirst();
        selected.load('text');
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load('items/text');
        await context.sync();

        if (selected.text.trim() === '') return null;
        const candidates = paragraphs.items
          .map((paragraph, index) => ({ paragraph, index }))
          .filter(({ paragraph }) => paragraph.text === selected.text);
        if (candidates.length === 0) return null;
        const [only] = candidates;
        if (candidates.length === 1 && only) return { index: only.index, text: selected.text };

        // Several paragraphs share this text: ask Word which one holds the selection.
        const selectedRange = selected.getRange('Whole');
        const relations = candidates.map(({ paragraph }) =>
          paragraph.getRange('Whole').compareLocationWith(selectedRange),
        );
        await context.sync();
        const hit = relations.findIndex((relation) => relation.value === 'Equal');
        const match = candidates[hit];
        return match ? { index: match.index, text: selected.text } : null;
      });
    },

    async replaceParagraphAsTrackedChange(target, newText) {
      if (!this.supportsTrackedChanges()) throw new TrackedChangesUnsupportedError();
      await Word.run(async (context) => {
        const document = context.document;
        document.load('changeTrackingMode');
        const paragraphs = document.body.paragraphs;
        paragraphs.load('items/text');
        await context.sync();

        const paragraph = paragraphs.items[target.index];
        if (!paragraph || paragraph.text !== target.text) throw new ParagraphChangedError();

        const previousMode = document.changeTrackingMode;
        document.changeTrackingMode = 'TrackAll';
        await context.sync();
        try {
          // "Content" keeps the paragraph mark, so the paragraph style survives.
          paragraph.getRange('Content').insertText(newText, 'Replace');
          await context.sync();
        } finally {
          document.changeTrackingMode = previousMode;
          await context.sync();
        }
      });
    },

    supportsTrackedChanges() {
      return Office.context.requirements.isSetSupported('WordApi', '1.4');
    },
  };
}
