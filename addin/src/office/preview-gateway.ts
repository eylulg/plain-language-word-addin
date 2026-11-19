import { SAMPLE_DOCUMENT } from './sample-document';
import type { SelectedParagraph, WordGateway } from './types';
import { ParagraphChangedError } from './types';

/**
 * An in-memory stand-in for Word, used when the task pane is opened in a
 * normal browser tab. Selecting a sentence also moves the "cursor" to its
 * paragraph, so the rewrite flow can be tried end to end.
 */
export function createPreviewGateway(initial: readonly string[] = SAMPLE_DOCUMENT): WordGateway {
  const paragraphs = [...initial];
  let cursor = paragraphs.findIndex((p) => p.length > 120);
  if (cursor < 0) cursor = 0;

  return {
    kind: 'preview',
    async readParagraphs() {
      return [...paragraphs];
    },
    async selectSentence(ref) {
      if (!paragraphs[ref.paragraphIndex]?.includes(ref.text)) return false;
      cursor = ref.paragraphIndex;
      return true;
    },
    async highlightSentences(refs) {
      return refs.filter((ref) => paragraphs[ref.paragraphIndex]?.includes(ref.text)).length;
    },
    async getSelectedParagraph(): Promise<SelectedParagraph | null> {
      const text = paragraphs[cursor];
      return text ? { index: cursor, text } : null;
    },
    async replaceParagraphAsTrackedChange(target, newText) {
      if (paragraphs[target.index] !== target.text) throw new ParagraphChangedError();
      paragraphs[target.index] = newText;
    },
    supportsTrackedChanges() {
      return true;
    },
  };
}
