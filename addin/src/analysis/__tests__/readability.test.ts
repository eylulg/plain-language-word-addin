import { describe, expect, it } from 'vitest';
import { fleschKincaidGrade, fleschReadingEase, readabilityLabel } from '../readability';

describe('Flesch formulas', () => {
  it.each([
    ['100 words, 5 sentences, 130 syllables', [100, 5, 130], 76.56, 7.55],
    ['one short sentence', [4, 1, 4], 118.18, -2.23],
    ['empty text', [0, 0, 0], 0, 0],
  ] as const)('scores %s', (_name, [words, sentences, syllables], ease, grade) => {
    expect(fleschReadingEase(words, sentences, syllables)).toBeCloseTo(ease, 2);
    expect(fleschKincaidGrade(words, sentences, syllables)).toBeCloseTo(grade, 2);
  });
});

describe('readabilityLabel', () => {
  it.each([
    [95, 'Very easy'],
    [65, 'Plain English'],
    [45, 'Difficult'],
    [10, 'Very difficult'],
  ] as const)('labels %i as %s', (ease, label) => {
    expect(readabilityLabel(ease)).toBe(label);
  });
});
