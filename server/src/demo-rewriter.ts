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
];

function matchCase(source: string, replacement: string): string {
  if (!replacement) return replacement;
  return source.charAt(0) === source.charAt(0).toUpperCase()
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

const normalise = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Used when no ANTHROPIC_API_KEY is set, so the add-in can be demoed for free.
 * Returns the fixture for the sample paragraph, otherwise swaps common
 * wordy phrases for plain ones.
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

      let rewrite = request.text;
      const changes: string[] = [];
      for (const [pattern, replacement, note] of REPLACEMENTS) {
        const next = rewrite.replace(pattern, (match) => matchCase(match, replacement));
        if (next !== rewrite && !changes.includes(note)) changes.push(note);
        rewrite = next;
      }
      rewrite = rewrite.replace(
        /(^|[.!?]\s+)([a-z])/g,
        (_m, lead: string, letter: string) => lead + letter.toUpperCase(),
      );

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
