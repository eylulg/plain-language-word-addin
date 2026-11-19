import { describe, expect, it } from 'vitest';
import { escapeSearchText, MAX_SEARCH_LENGTH, planSearch } from '../search';

describe('planSearch', () => {
  it('uses one search for a short sentence', () => {
    expect(planSearch(' Sign the form. ')).toEqual({ head: 'Sign the form.' });
  });

  it('splits a long sentence into a head and a tail on word boundaries', () => {
    const sentence = `${Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ')}.`;

    const plan = planSearch(sentence);

    expect(plan.head.length).toBeLessThanOrEqual(MAX_SEARCH_LENGTH);
    expect(sentence.startsWith(`${plan.head} `)).toBe(true);
    expect(sentence.endsWith(` ${plan.tail}`)).toBe(true);
  });
});

describe('escapeSearchText', () => {
  it('doubles the caret, which Word treats as a special code', () => {
    expect(escapeSearchText('2^10 bytes')).toBe('2^^10 bytes');
  });
});
