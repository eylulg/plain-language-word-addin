import { describe, expect, it, vi } from 'vitest';
import { createRewriteClient, RewriteError, type RewriteRequest } from '../rewrite-client';

const request: RewriteRequest = {
  text: 'Prior to the start.',
  targetGrade: 8,
  tone: 'neutral',
  protectedTerms: [],
};

describe('createRewriteClient', () => {
  it('posts the request to /rewrite and fills in optional fields', async () => {
    const fetchStub = vi.fn<typeof fetch>(async () =>
      Response.json({ rewrite: 'Before the start.', changes: ['Plainer'], model: 'm' }),
    );

    const result = await createRewriteClient('https://api.test/', fetchStub).rewrite(request);

    expect(fetchStub).toHaveBeenCalledWith(
      'https://api.test/rewrite',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(request) }),
    );
    expect(result).toEqual({
      rewrite: 'Before the start.',
      changes: ['Plainer'],
      warnings: [],
      model: 'm',
      demo: false,
    });
  });

  it.each([
    [
      'a rate limit',
      async () => Response.json({ error: 'rate' }, { status: 429 }),
      /Wait a minute/,
    ],
    [
      'a validation error',
      async () => Response.json({ error: 'Text is empty.' }, { status: 400 }),
      /Text is empty/,
    ],
    [
      'a network failure',
      async () => Promise.reject(new TypeError('Failed to fetch')),
      /Could not reach/,
    ],
    ['a malformed response', async () => Response.json({ nope: true }), /unexpected response/],
  ])('turns %s into a readable error', async (_name, respond, message) => {
    const client = createRewriteClient('https://api.test', vi.fn<typeof fetch>(respond));

    const error = await client.rewrite(request).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RewriteError);
    expect(error).toHaveProperty('message', expect.stringMatching(message));
  });
});
