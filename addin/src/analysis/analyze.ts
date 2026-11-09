import {
  findFillers,
  findJargon,
  findLongSentence,
  findNominalisations,
  findPassiveVoice,
} from "./detectors";
import { countText, readabilityLabel, statsFromCounts } from "./readability";
import { splitSentences } from "./sentences";
import type { AnalysisOptions, DocumentAnalysis, Issue, IssueCounts, ParagraphAnalysis } from "./types";
import { ISSUE_TYPES } from "./types";

export const DEFAULT_LONG_SENTENCE_WORDS = 25;

export function emptyIssueCounts(): IssueCounts {
  return Object.fromEntries(ISSUE_TYPES.map((type) => [type, 0])) as IssueCounts;
}

export function countIssues(issues: readonly Issue[]): IssueCounts {
  const counts = emptyIssueCounts();
  for (const issue of issues) counts[issue.type] += 1;
  return counts;
}

export function analyzeParagraph(
  text: string,
  index: number,
  options: AnalysisOptions = {},
): ParagraphAnalysis {
  const maxWords = options.longSentenceWords ?? DEFAULT_LONG_SENTENCE_WORDS;
  const sentences = splitSentences(text);
  const issues: Issue[] = [];

  sentences.forEach((sentence, sentenceIndex) => {
    const jargon = findJargon(sentence.text);
    const jargonText = jargon.map((j) => j.match.toLowerCase());
    // A word already reported as jargon ("commencement") is not reported twice.
    const nominalisations = findNominalisations(sentence.text).filter(
      (n) => !jargonText.some((j) => j.includes(n.match.toLowerCase())),
    );
    const findings = [
      ...findLongSentence(sentence.text, maxWords),
      ...findPassiveVoice(sentence.text),
      ...nominalisations,
      ...jargon,
      ...findFillers(sentence.text),
    ];
    findings.forEach((finding, n) => {
      issues.push({
        ...finding,
        id: `p${index}-s${sentenceIndex}-${finding.type}-${n}`,
        paragraphIndex: index,
        sentenceIndex,
        sentence: sentence.text,
      });
    });
  });

  const stats = statsFromCounts(countText(sentences.map((s) => s.text)));
  return { index, text, sentences, stats, issues };
}

/**
 * Analyses a document given as a list of paragraph texts, in document order.
 * Empty paragraphs keep their index so issues map back to Word paragraphs.
 */
export function analyzeDocument(
  paragraphs: readonly string[],
  options: AnalysisOptions = {},
): DocumentAnalysis {
  const analysed = paragraphs.map((text, index) => analyzeParagraph(text, index, options));
  const withText = analysed.filter((p) => p.sentences.length > 0);
  const allSentences = withText.flatMap((p) => p.sentences.map((s) => s.text));
  const stats = statsFromCounts(countText(allSentences));
  const issues = withText.flatMap((p) => p.issues);
  return {
    paragraphs: withText,
    stats,
    issues,
    issueCounts: countIssues(issues),
    label: readabilityLabel(stats.readingEase),
  };
}
