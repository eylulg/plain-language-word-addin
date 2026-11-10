import { findPreservationWarnings } from "./checks.js";
import type { Rewriter } from "./rewriter.js";

/** The sample paragraph from the add-in's browser preview, with a hand-written rewrite. */
export const DEMO_FIXTURE = {
  original:
    "In the event that the tenant fails to make payment of the rent in accordance with the terms hereinafter set out, the landlord shall be entitled to terminate the agreement forthwith and to recover possession of the premises.",
  rewrite:
    "If the tenant does not pay the rent as these terms require, the landlord can end the agreement straight away and take back the premises.",
  changes: [
    'Replaced "in the event that" with "if".',
    'Turned "make payment of" into "pay".',
    'Replaced "forthwith" with "straight away".',
    'Replaced "shall be entitled to" with "can".',
  ],
};

const NUMBER_DOUBLET =
  /\b(?:(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:-\w+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|(?:thir|four|fif|six|seven|eigh|nine)teen|hundred|thousand)\s+\((\d[\d,.]*)\)/gi;

const REPLACEMENTS: readonly [RegExp, string, string][] = [
  [/\bin the event that\b/gi, "if", 'Replaced "in the event that" with "if".'],
  [/\bprior to\b/gi, "before", 'Replaced "prior to" with "before".'],
  [/\bsubsequent to\b/gi, "after", 'Replaced "subsequent to" with "after".'],
  [/\bin order to\b/gi, "to", 'Shortened "in order to" to "to".'],
  [/\bin accordance with\b/gi, "under", 'Replaced "in accordance with" with "under".'],
  [/\bpursuant to\b/gi, "under", 'Replaced "pursuant to" with "under".'],
  [/\butili[sz]e\b/gi, "use", 'Replaced "utilise" with "use".'],
  [/\bcommence(?:ment)?\b/gi, "start", 'Replaced "commence" with "start".'],
  [/\bterminate\b/gi, "end", 'Replaced "terminate" with "end".'],
  [/\bforthwith\b/gi, "at once", 'Replaced "forthwith" with "at once".'],
  [/\bapproximately\b/gi, "about", 'Replaced "approximately" with "about".'],
  [/\bit should be noted that\s*/gi, "", 'Removed "it should be noted that".'],
  [/\b(?:really|very|basically|quite)\s+/gi, "", "Removed filler words."],
  [/\bnotwithstanding\b/gi, "despite", 'Replaced "notwithstanding" with "despite".'],
  [/\bherein\b/gi, "here", 'Replaced "herein" with "here".'],
  [/\bhereinafter\b/gi, "from now on", 'Replaced "hereinafter" with "from now on".'],
  [/\bthereof\b/gi, "of it", 'Replaced "thereof" with "of it".'],
  [/\bany and all\b/gi, "all", 'Replaced "any and all" with "all".'],
  [/\beach and every\b/gi, "every", 'Replaced "each and every" with "every".'],
  [/\bnull and void\b/gi, "void", 'Replaced "null and void" with "void".'],
  [
    /\bindemnify and hold harmless\b/gi,
    "cover the losses of",
    'Replaced "indemnify and hold harmless" with "cover the losses of".',
  ],
  [/\bfrom and against\b/gi, "against", 'Replaced "from and against" with "against".'],
  [
    /\bas a result of or in connection with\b/gi,
    "because of",
    'Replaced "as a result of or in connection with" with "because of".',
  ],
  [/\bas a result of\b/gi, "because of", 'Replaced "as a result of" with "because of".'],
  [/\bin connection with\b/gi, "about", 'Replaced "in connection with" with "about".'],
  [/\bprovided that\b/gi, "but only if", 'Replaced "provided that" with "but only if".'],
  [/\bshall have (\w+ed|given|made|taken)\b/gi, "has $1", 'Replaced "shall have" with "has".'],
  [/\bshall\b/gi, "must", 'Replaced "shall" with "must".'],
  [/\bwritten notification\b/gi, "written notice", 'Replaced "written notification" with "written notice".'],
  [/\bmake payment of\b/gi, "pay", 'Turned "make payment of" into "pay".'],
  [/\bsufficient\b/gi, "enough", 'Replaced "sufficient" with "enough".'],
  [NUMBER_DOUBLET, "$1", "Gave each number once instead of in words and digits."],
];

const LONG_SENTENCE_WORDS = 25;
const MIN_PART_WORDS = 7;

/** Where a long sentence can break, and what the second half starts with. */
const SPLIT_POINTS: readonly [RegExp, string][] = [
  [/, and (?=\S)/g, ""],
  [/, but (?=\S)/g, "But "],
  [/, which (?=\S)/g, "This "],
  [/, whereas (?=\S)/g, "But "],
  [/; /g, ""],
];

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Breaks one over-long sentence in two at the conjunction closest to its middle. */
function splitSentence(sentence: string): string {
  const total = countWords(sentence);
  if (total <= LONG_SENTENCE_WORDS) return sentence;

  let best: { index: number; length: number; lead: string; gap: number } | null = null;
  for (const [pattern, lead] of SPLIT_POINTS) {
    for (const match of sentence.matchAll(pattern)) {
      const before = countWords(sentence.slice(0, match.index));
      const after = total - before;
      if (before < MIN_PART_WORDS || after < MIN_PART_WORDS) continue;
      const gap = Math.abs(before - after);
      if (!best || gap < best.gap) best = { index: match.index, length: match[0].length, lead, gap };
    }
  }
  if (!best) return sentence;

  const first = sentence.slice(0, best.index).replace(/[,;]$/, "");
  const rest = best.lead + sentence.slice(best.index + best.length);
  const ending = /[.!?]$/.test(first) ? "" : ".";
  return `${first}${ending} ${upperFirst(rest)}`;
}

function shortenLongSentences(text: string): string {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(splitSentence)
    .join(" ");
}

function matchCase(source: string, replacement: string): string {
  if (!replacement) return replacement;
  return source.charAt(0) === source.charAt(0).toUpperCase()
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

const normalise = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Used when no ANTHROPIC_API_KEY is set, so the add-in can be demoed for free.
 * Returns the fixture for the sample paragraph. Any other paragraph gets its
 * listed jargon swapped for plain words and its long sentences split at a
 * conjunction. Text that needs neither comes back unchanged.
 */
export function createDemoRewriter(): Rewriter {
  return {
    async rewrite(request) {
      if (normalise(request.text) === normalise(DEMO_FIXTURE.original)) {
        return {
          rewrite: DEMO_FIXTURE.rewrite,
          changes: [...DEMO_FIXTURE.changes],
          warnings: [],
          model: "demo",
          demo: true,
        };
      }

      let rewrite = normalise(request.text);
      const changes: string[] = [];
      for (const [pattern, replacement, note] of REPLACEMENTS) {
        const next = rewrite.replace(pattern, (match) =>
          matchCase(match, match.replace(new RegExp(pattern.source, "i"), replacement)),
        );
        if (next !== rewrite && !changes.includes(note)) changes.push(note);
        rewrite = next;
      }
      rewrite = rewrite.replace(
        /(^|[.!?]\s+)([a-z])/g,
        (_m, lead: string, letter: string) => lead + letter.toUpperCase(),
      );
      const shortened = shortenLongSentences(rewrite);
      if (shortened !== rewrite) changes.push("Split a long sentence in two.");
      rewrite = shortened;

      return {
        rewrite,
        changes,
        warnings: findPreservationWarnings(request.text, rewrite, request.protectedTerms),
        model: "demo",
        demo: true,
      };
    },
  };
}
