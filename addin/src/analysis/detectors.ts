import type { IssueType } from "./types";
import {
  BE_VERBS,
  FILLERS,
  IRREGULAR_PARTICIPLES,
  JARGON,
  NOMINALISATION_VERBS,
  PARTICIPLE_EXCEPTIONS,
  PASSIVE_GAP_WORDS,
} from "./wordlists";
import { escapeRegExp, tokenizeWords } from "./words";

interface Finding {
  type: IssueType;
  match: string;
  message: string;
  suggestion?: string;
}

function phrasePattern(phrases: readonly string[]): RegExp {
  const sorted = [...phrases].sort((a, b) => b.length - a.length).map(escapeRegExp);
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${sorted.join("|")})(?![\\p{L}\\p{N}])`, "giu");
}

const JARGON_PATTERN = phrasePattern(Object.keys(JARGON));
/** A number spelled out and repeated in digits: "thirty (30)". */
const NUMBER_DOUBLET_PATTERN = /(?<![\p{L}\p{N}])[\p{L}]+(?:-[\p{L}]+)?\s+\((\d[\d,.]*)\)/gu;
const FILLER_PATTERN = phrasePattern(FILLERS);

export function findLongSentence(sentence: string, maxWords: number): Finding[] {
  const words = tokenizeWords(sentence).length;
  if (words <= maxWords) return [];
  return [
    {
      type: "long-sentence",
      match: sentence,
      message: `${words} words. Aim for ${maxWords} or fewer.`,
      suggestion: "Split it into two or more sentences.",
    },
  ];
}

export function findJargon(sentence: string): Finding[] {
  const doublets = [...sentence.matchAll(NUMBER_DOUBLET_PATTERN)].map((m) => ({
    type: "jargon" as const,
    match: m[0],
    message: `"${m[0]}" gives the same number twice.`,
    suggestion: `Try "${m[1]}".`,
  }));
  const phrases = [...sentence.matchAll(JARGON_PATTERN)].map((m) => {
    const plain = JARGON[m[0].toLowerCase()];
    return {
      type: "jargon" as const,
      match: m[0],
      message: `"${m[0]}" is formal or legal wording.`,
      ...(plain ? { suggestion: `Try "${plain}".` } : {}),
    };
  });
  return [...phrases, ...doublets];
}

export function findFillers(sentence: string): Finding[] {
  return [...sentence.matchAll(FILLER_PATTERN)].map((m) => ({
    type: "filler" as const,
    match: m[0],
    message: `"${m[0]}" adds length without meaning.`,
    suggestion: "Remove it.",
  }));
}

function isParticiple(word: string): boolean {
  const lower = word.toLowerCase();
  if (PARTICIPLE_EXCEPTIONS.has(lower)) return false;
  if (IRREGULAR_PARTICIPLES.has(lower)) return true;
  return lower.length > 3 && /(?:ed|en)$/.test(lower);
}

/**
 * Heuristic passive voice check: a form of "to be", up to two adverbs such as
 * "not" or "already", then a past participle ("was paid", "is not required").
 */
export function findPassiveVoice(sentence: string): Finding[] {
  const words = tokenizeWords(sentence);
  const findings: Finding[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const verb = words[i];
    if (verb === undefined || !BE_VERBS.has(verb.toLowerCase())) continue;
    let j = i + 1;
    while (j < words.length && j <= i + 2 && PASSIVE_GAP_WORDS.has((words[j] ?? "").toLowerCase())) j += 1;
    const candidate = words[j];
    if (candidate !== undefined && isParticiple(candidate)) {
      const phrase = words.slice(i, j + 1).join(" ");
      const hasAgent = words.slice(j + 1, j + 6).some((w) => w.toLowerCase() === "by");
      findings.push({
        type: "passive-voice",
        match: phrase,
        message: `"${phrase}" is passive.`,
        suggestion: hasAgent
          ? 'Start with who does the action, named after "by".'
          : "Say who does the action, and put them first.",
      });
      i = j;
    }
  }
  return findings;
}

export function findNominalisations(sentence: string): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const word of tokenizeWords(sentence)) {
    const lower = word.toLowerCase();
    const singular = lower.replace(/s$/, "");
    const verb = NOMINALISATION_VERBS[lower] ?? NOMINALISATION_VERBS[singular];
    if (verb === undefined || seen.has(lower)) continue;
    seen.add(lower);
    findings.push({
      type: "nominalisation",
      match: word,
      message: `"${word}" hides an action inside a noun.`,
      suggestion: `Try the verb "${verb}".`,
    });
  }
  return findings;
}
