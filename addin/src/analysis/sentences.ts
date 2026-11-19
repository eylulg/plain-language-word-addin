import type { Sentence } from './types';

/** Abbreviations whose trailing full stop never ends a sentence. */
const NON_TERMINAL_ABBREVIATIONS = new Set([
  'mr',
  'mrs',
  'ms',
  'mx',
  'dr',
  'prof',
  'sr',
  'jr',
  'st',
  'rev',
  'hon',
  'gen',
  'col',
  'capt',
  'lt',
  'vs',
  'v',
  'no',
  'nos',
  'art',
  'arts',
  'sec',
  'secs',
  'para',
  'paras',
  'fig',
  'figs',
  'ch',
  'cl',
  'p',
  'pp',
  'vol',
  'vols',
  'ed',
  'eds',
  'approx',
  'dept',
  'est',
  'cf',
  'e.g',
  'i.e',
  'viz',
  'al',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'sept',
  'oct',
  'nov',
  'dec',
  'u.s',
  'u.k',
  'e.u',
  'a.m',
  'p.m',
  'ph.d',
  'b.a',
  'm.a',
  'b.sc',
  'm.sc',
  'ref',
  'tel',
  'ext',
]);

const TERMINATORS = new Set(['.', '!', '?', '\u2026']);
const CLOSERS = new Set(['"', "'", '\u201d', '\u2019', ')', ']', '\u00bb']);
const OPENERS = /^[("'\u201c\u2018[\u00ab]+/;

/** List markers such as "1.", "a)", "(iv)", "-" or a bullet at the start of a line. */
const LIST_MARKER =
  /^\s*(?:\(?\d{1,3}[.)]|\(?[a-z][.)]|[A-Z]\)|\((?:[ivxlcdm]+|[a-z]|\d{1,3})\)|[ivxlcdm]{1,5}\.|[-*\u2022\u2023\u25e6\u25aa])\s+/;

const LINE_PATTERN = /[^\r\n\v\u2028\u2029]+/g;

function tokenBefore(text: string, index: number): string {
  let begin = index;
  while (begin > 0 && !/\s/.test(text.charAt(begin - 1))) begin -= 1;
  return text.slice(begin, index).replace(OPENERS, '');
}

function isBoundary(text: string, termIndex: number, afterIndex: number, lineEnd: number): boolean {
  if (afterIndex >= lineEnd) return true;
  if (!/\s/.test(text.charAt(afterIndex))) return false;

  let next = afterIndex;
  while (next < lineEnd && /\s/.test(text.charAt(next))) next += 1;
  if (next >= lineEnd) return true;

  const nextChar = text.charAt(next);
  if (/\p{Ll}/u.test(nextChar)) return false;

  const run = text.slice(termIndex, afterIndex).replace(/[^.!?\u2026]/g, '');
  if (run === '.') {
    const token = tokenBefore(text, termIndex);
    if (NON_TERMINAL_ABBREVIATIONS.has(token.toLowerCase())) return false;
    // A single capital letter is an initial, as in "J. K. Rowling".
    if (/^\p{Lu}$/u.test(token)) return false;
  }
  return true;
}

function pushSentence(sentences: Sentence[], text: string, start: number, end: number): void {
  let from = start;
  let to = end;
  while (from < to && /\s/.test(text.charAt(from))) from += 1;
  while (to > from && /\s/.test(text.charAt(to - 1))) to -= 1;
  const slice = text.slice(from, to);
  if (/[\p{L}\p{N}]/u.test(slice)) sentences.push({ text: slice, start: from, end: to });
}

/**
 * Splits a paragraph into sentences with their character offsets.
 *
 * Handles common abbreviations, initials, decimal numbers, ellipses,
 * closing quotes after the full stop, manual line breaks and list markers.
 */
export function splitSentences(paragraph: string): Sentence[] {
  const sentences: Sentence[] = [];

  for (const line of paragraph.matchAll(LINE_PATTERN)) {
    const lineStart = line.index;
    const lineEnd = lineStart + line[0].length;
    const marker = LIST_MARKER.exec(line[0]);
    let start = lineStart + (marker ? marker[0].length : 0);

    let i = start;
    while (i < lineEnd) {
      if (!TERMINATORS.has(paragraph.charAt(i))) {
        i += 1;
        continue;
      }
      let after = i;
      while (after < lineEnd && TERMINATORS.has(paragraph.charAt(after))) after += 1;
      while (after < lineEnd && CLOSERS.has(paragraph.charAt(after))) after += 1;

      if (isBoundary(paragraph, i, after, lineEnd)) {
        pushSentence(sentences, paragraph, start, after);
        start = after;
      }
      i = after;
    }
    pushSentence(sentences, paragraph, start, lineEnd);
  }

  return sentences;
}
