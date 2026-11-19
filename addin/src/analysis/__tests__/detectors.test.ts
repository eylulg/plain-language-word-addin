import { describe, expect, it } from 'vitest';
import {
  findFillers,
  findJargon,
  findLongSentence,
  findNominalisations,
  findPassiveVoice,
} from '../detectors';

const words = (n: number) => `${Array.from({ length: n }, () => 'word').join(' ')}.`;

describe('findLongSentence', () => {
  it.each([
    [25, []],
    [26, ['26 words. Aim for 25 or fewer.']],
  ])('flags a sentence of %i words only when over the limit', (count, messages) => {
    expect(findLongSentence(words(count), 25).map((f) => f.message)).toEqual(messages);
  });
});

describe('findPassiveVoice', () => {
  it.each([
    ['The form was signed by the tenant.', ['was signed']],
    ['Mistakes were made.', ['were made']],
    ['The keys were not returned.', ['were not returned']],
    ['Fees are already paid.', ['are already paid']],
    ['She is interested.', []],
    ['The landlord shall be entitled to end it.', []],
    ['The tenant signed the form.', []],
    ['There were seven of them.', []],
  ])('finds the passives in %j', (sentence, expected) => {
    expect(findPassiveVoice(sentence).map((f) => f.match)).toEqual(expected);
  });

  it("asks to move the actor first when 'by' names it", () => {
    const [withActor] = findPassiveVoice('It was paid by the bank.');
    const [withoutActor] = findPassiveVoice('It was paid.');

    expect(withActor?.suggestion).toBe('Start with who does the action, named after "by".');
    expect(withoutActor?.suggestion).toBe('Say who does the action, and put them first.');
  });
});

describe('findNominalisations', () => {
  it.each([
    ['We will make a decision soon.', [['decision', 'Try the verb "decide".']]],
    ['Terminate the agreement and recover possession under your obligations.', []],
    ['The government sent information.', []],
    ['Payment, payment and more payment.', [['Payment', 'Try the verb "pay".']]],
  ])('finds %j', (sentence, expected) => {
    expect(findNominalisations(sentence).map((f) => [f.match, f.suggestion])).toEqual(expected);
  });
});

describe('findJargon', () => {
  it.each([
    [
      'In the event that you leave, return the keys prior to Friday.',
      [
        ['In the event that', 'Try "if".'],
        ['prior to', 'Try "before".'],
      ],
    ],
    [
      'Pay any and all fees within thirty (30) days.',
      [
        ['any and all', 'Try "any or all".'],
        ['thirty (30)', 'Try "30".'],
      ],
    ],
    ['The deemster spoke.', []],
  ])('finds %j', (sentence, expected) => {
    expect(findJargon(sentence).map((f) => [f.match, f.suggestion])).toEqual(expected);
  });
});

describe('findFillers', () => {
  it('finds filler words and phrases', () => {
    expect(
      findFillers('It should be noted that this is really very simple.').map((f) => f.match),
    ).toEqual(['It should be noted that', 'really', 'very']);
  });
});
