const SPECIAL_CASES: Record<string, number> = {
  the: 1,
  every: 2,
  business: 2,
  people: 2,
  area: 3,
  idea: 3,
  real: 1,
  being: 2,
  create: 2,
  created: 3,
  science: 2,
  quiet: 2,
  poem: 2,
  fire: 1,
  hour: 1,
  our: 1,
  doesn: 1,
  wednesday: 2,
};

/**
 * Estimates syllables in an English word with a vowel-group heuristic.
 * Good enough for readability formulas, which only need averages.
 * A numeral counts as one syllable however many digits it has.
 */
export function countSyllables(rawWord: string): number {
  if (/^\d[\d.,]*%?$/.test(rawWord)) return 1;

  const word = rawWord.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length === 0) return 0;
  const special = SPECIAL_CASES[word];
  if (special !== undefined) return special;
  if (word.length <= 3) return 1;

  const stem = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = stem.match(/[aeiouy]+/g)?.length ?? 0;
  return Math.max(1, groups);
}
