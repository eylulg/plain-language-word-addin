const WORD_PATTERN = /[\p{L}\p{N}]+(?:['\u2019.,-][\p{L}\p{N}]+)*%?/gu;

/**
 * Splits text into words. Contractions, hyphenated words and numbers such as
 * "1,250.50" or "12%" each count as one word.
 */
export function tokenizeWords(text: string): string[] {
  return text.match(WORD_PATTERN) ?? [];
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
