const NUMBER_PATTERN = /\d+(?:[.,:/]\d+)*%?/g;

/**
 * Compares the rewrite with the original and lists anything the original had,
 * that should have been kept word for word, and is gone: numbers and protected
 * terms. A protected term the original never contained is not a problem.
 */
export function findPreservationWarnings(
  original: string,
  rewrite: string,
  protectedTerms: readonly string[],
): string[] {
  const warnings: string[] = [];
  const numbers = new Set(original.match(NUMBER_PATTERN) ?? []);
  for (const number of numbers) {
    if (!rewrite.includes(number))
      warnings.push(`The number "${number}" from the original is not in the rewrite.`);
  }
  for (const term of protectedTerms) {
    if (original.includes(term) && !rewrite.includes(term))
      warnings.push(`The protected term "${term}" is not in the rewrite.`);
  }
  return warnings;
}
