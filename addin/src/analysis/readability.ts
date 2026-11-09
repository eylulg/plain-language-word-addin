import { countSyllables } from "./syllables";
import type { ReadabilityLabel, TextStats } from "./types";
import { tokenizeWords } from "./words";

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Flesch Reading Ease. Higher is easier; 60 to 70 reads as plain English. */
export function fleschReadingEase(words: number, sentences: number, syllables: number): number {
  if (words === 0 || sentences === 0) return 0;
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}

/** Flesch-Kincaid grade level: the US school grade needed to follow the text. */
export function fleschKincaidGrade(words: number, sentences: number, syllables: number): number {
  if (words === 0 || sentences === 0) return 0;
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
}

interface Counts {
  sentences: number;
  words: number;
  syllables: number;
  complexWords: number;
}

export function countText(sentences: readonly string[]): Counts {
  let words = 0;
  let syllables = 0;
  let complexWords = 0;
  for (const sentence of sentences) {
    for (const word of tokenizeWords(sentence)) {
      const count = countSyllables(word);
      words += 1;
      syllables += count;
      if (count >= 3) complexWords += 1;
    }
  }
  return { sentences: sentences.length, words, syllables, complexWords };
}

export function statsFromCounts(counts: Counts): TextStats {
  const { sentences, words, syllables, complexWords } = counts;
  const ease = fleschReadingEase(words, sentences, syllables);
  const grade = fleschKincaidGrade(words, sentences, syllables);
  return {
    sentences,
    words,
    syllables,
    complexWords,
    averageSentenceLength: sentences === 0 ? 0 : round1(words / sentences),
    averageSyllablesPerWord: words === 0 ? 0 : Math.round((syllables / words) * 100) / 100,
    readingEase: round1(Math.min(121.22, Math.max(0, ease))),
    gradeLevel: round1(Math.max(0, grade)),
  };
}

export function readabilityLabel(readingEase: number): ReadabilityLabel {
  if (readingEase >= 90) return "Very easy";
  if (readingEase >= 80) return "Easy";
  if (readingEase >= 70) return "Fairly easy";
  if (readingEase >= 60) return "Plain English";
  if (readingEase >= 50) return "Fairly difficult";
  if (readingEase >= 30) return "Difficult";
  return "Very difficult";
}
