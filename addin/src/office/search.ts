/** Word rejects search strings longer than 255 characters. */
export const MAX_SEARCH_LENGTH = 255;
const EDGE_LENGTH = 120;

/**
 * Word treats "^" as the start of a special code (^p, ^t) even without
 * wildcards, so it has to be doubled to match literally.
 */
export function escapeSearchText(text: string): string {
  return text.replace(/\^/g, "^^");
}

export interface SearchPlan {
  head: string;
  /** Only set when the text is too long for one search. */
  tail?: string;
}

/**
 * Plans how to find a sentence. Short sentences are found with one search.
 * Long ones are found by their first and last words, then expanded.
 */
export function planSearch(text: string): SearchPlan {
  const trimmed = text.trim();
  if (escapeSearchText(trimmed).length <= MAX_SEARCH_LENGTH) return { head: escapeSearchText(trimmed) };

  const head = trimmed.slice(0, EDGE_LENGTH).replace(/\s+\S*$/, "");
  const tail = trimmed.slice(-EDGE_LENGTH).replace(/^\S*\s+/, "");
  return { head: escapeSearchText(head), tail: escapeSearchText(tail) };
}
