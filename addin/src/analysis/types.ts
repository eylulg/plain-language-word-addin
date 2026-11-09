export type IssueType = "long-sentence" | "passive-voice" | "nominalisation" | "jargon" | "filler";

export const ISSUE_TYPES: readonly IssueType[] = [
  "long-sentence",
  "passive-voice",
  "nominalisation",
  "jargon",
  "filler",
];

export const ISSUE_LABELS: Record<IssueType, string> = {
  "long-sentence": "Long sentence",
  "passive-voice": "Passive voice",
  nominalisation: "Nominalisation",
  jargon: "Jargon",
  filler: "Filler word",
};

/** A sentence located inside its paragraph by character offsets. */
export interface Sentence {
  text: string;
  /** Offset of the first character in the paragraph text. */
  start: number;
  /** Offset one past the last character in the paragraph text. */
  end: number;
}

export interface Issue {
  id: string;
  type: IssueType;
  paragraphIndex: number;
  sentenceIndex: number;
  /** The full sentence, used to find and select it in the document. */
  sentence: string;
  /** The words that triggered the issue. */
  match: string;
  message: string;
  suggestion?: string;
}

export interface TextStats {
  sentences: number;
  words: number;
  syllables: number;
  /** Words of three or more syllables. */
  complexWords: number;
  averageSentenceLength: number;
  averageSyllablesPerWord: number;
  readingEase: number;
  gradeLevel: number;
}

export interface ParagraphAnalysis {
  index: number;
  text: string;
  sentences: Sentence[];
  stats: TextStats;
  issues: Issue[];
}

export type IssueCounts = Record<IssueType, number>;

export interface DocumentAnalysis {
  paragraphs: ParagraphAnalysis[];
  stats: TextStats;
  issues: Issue[];
  issueCounts: IssueCounts;
  label: ReadabilityLabel;
}

export type ReadabilityLabel =
  | "Very easy"
  | "Easy"
  | "Fairly easy"
  | "Plain English"
  | "Fairly difficult"
  | "Difficult"
  | "Very difficult";

export interface AnalysisOptions {
  /** Sentences with more words than this are flagged. Default 25. */
  longSentenceWords?: number;
}
