import { describe, expect, it } from 'vitest';
import { diffWords } from '../diff';

const side = (parts: ReturnType<typeof diffWords>, skip: 'insert' | 'delete') =>
  parts
    .filter((p) => p.op !== skip)
    .map((p) => p.text)
    .join('');

describe('diffWords', () => {
  it('marks replaced words as one delete then one insert', () => {
    const parts = diffWords('Return it prior to Friday.', 'Return it before Friday.');

    expect(parts.filter((p) => p.op !== 'equal')).toEqual([
      { op: 'delete', text: 'prior to' },
      { op: 'insert', text: 'before' },
    ]);
  });

  it.each([
    ['identical text', 'Sign the form.', 'Sign the form.'],
    [
      'a rewrite',
      'In the event that you leave, return the keys.',
      'If you leave, return the keys to us.',
    ],
    ['empty before', '', 'New text'],
    ['empty after', 'Old', ''],
  ])('rebuilds both sides of %s', (_name, before, after) => {
    const parts = diffWords(before, after);

    expect(side(parts, 'insert')).toBe(before);
    expect(side(parts, 'delete')).toBe(after);
  });
});
