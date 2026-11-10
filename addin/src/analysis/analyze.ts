import {
  findFillers,
  findJargon,
  findLongSentence,
  findNominalisations,
  findPassiveVoice,
} from "./detectors";
import { countText, readabilityLabel, statsFromCounts } from "./readability";
import { splitSentences } from "./sentences";
import type { DocumentAnalysis, Issue, IssueCounts, ParagraphAnalysis } from "./types";

export const LONG_SENTENCE_WORDS = 25;

export function countIssues(issues: readonly Issue[]): IssueCounts {
  const counts: IssueCounts = {
    "long-sentence": 0,
    "passive-voice": 0,
    nominalisation: 0,
    jargon: 0,
    filler: 0,
  };
  for (const issue of issues) counts[issue.type] += 1;
  return counts;
}

export function analyzeParagraph(text: string, index: number): ParagraphAnalysis {
  const sentences = splitSentences(text);
  const issues: Issue[] = [];

  sentences.forEach((sentence, sentenceIndex) => {
    const jargon = findJargon(sentence.text);
    const jargonText = jargon.map((j) => j.match.toLowerCase());
    // A word already reported as jargon ("commencement") is not reported twice.
    const nominalisations = findNominalisations(sentence.text).filter(
      (n) => !jargonText.some((j) => j.includes(n.match.toLowerCase())),
    );
    const fillers = findFillers(sentence.text);
    // "It should be noted that" contains a passive, but it is one filler, not two issues.
    const passives = findPassiveVoice(sentence.text).filter(
      (p) => !fillers.some((f) => f.match.toLowerCase().includes(p.match.toLowerCase())),
    );
    const findings = [
      ...findLongSentence(sentence.text, LONG_SENTENCE_WORDS),
      ...passives,
      ...nominalisations,
      ...jargon,
      ...fillers,
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
 * Analyses a document given as paragraph texts in document order.
 * Empty paragraphs keep their index so issues map back to Word paragraphs.
 */
export function analyzeDocument(paragraphs: readonly string[]): DocumentAnalysis {
  const analysed = paragraphs.map((text, index) => analyzeParagraph(text, index));
  const withText = analysed.filter((p) => p.sentences.length > 0);
  const stats = statsFromCounts(countText(withText.flatMap((p) => p.sentences.map((s) => s.text))));
  const issues = withText.flatMap((p) => p.issues);
  return {
    paragraphs: withText,
    stats,
    issues,
    issueCounts: countIssues(issues),
    label: readabilityLabel(stats.readingEase),
  };
}
