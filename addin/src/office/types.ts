/** A sentence in the document, addressed by its paragraph and its exact text. */
export interface SentenceRef {
  paragraphIndex: number;
  text: string;
}

export interface SelectedParagraph {
  /** Index of the paragraph in the document body. */
  index: number;
  text: string;
}

/**
 * Everything the task pane needs from Word. The UI only talks to this
 * interface, so tests can swap in a fake and the browser preview can run
 * without Office.
 */
export interface WordGateway {
  /** "word" inside Office, "preview" in a plain browser tab. */
  readonly kind: 'word' | 'preview';
  readParagraphs(): Promise<string[]>;
  /** Selects the sentence in the document. Resolves false if it was not found. */
  selectSentence(ref: SentenceRef): Promise<boolean>;
  /** Sets or clears (color null) the highlight on each sentence. Resolves the number found. */
  highlightSentences(refs: readonly SentenceRef[], color: string | null): Promise<number>;
  /** The paragraph holding the cursor or the start of the selection. */
  getSelectedParagraph(): Promise<SelectedParagraph | null>;
  /**
   * Replaces the paragraph text with change tracking on, then restores the
   * previous tracking mode. Rejects with ParagraphChangedError when the
   * paragraph no longer holds the expected text.
   */
  replaceParagraphAsTrackedChange(paragraph: SelectedParagraph, newText: string): Promise<void>;
  supportsTrackedChanges(): boolean;
}

export class ParagraphChangedError extends Error {
  constructor() {
    super('The paragraph changed after the rewrite was requested. Request a new rewrite.');
    this.name = 'ParagraphChangedError';
  }
}

export class TrackedChangesUnsupportedError extends Error {
  constructor() {
    super('This version of Word does not support tracked changes from add-ins (WordApi 1.4).');
    this.name = 'TrackedChangesUnsupportedError';
  }
}
