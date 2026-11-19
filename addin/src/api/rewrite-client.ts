import { z } from 'zod';

export const TONES = ['neutral', 'friendly', 'formal'] as const;
type Tone = (typeof TONES)[number];

export interface RewriteRequest {
  text: string;
  targetGrade: number;
  tone: Tone;
  /** Leave out to use the server default model. */
  model?: string;
  protectedTerms: string[];
}

const RewriteResultSchema = z.object({
  rewrite: z.string(),
  changes: z.array(z.string()),
  warnings: z.array(z.string()).default([]),
  model: z.string(),
  demo: z.boolean().default(false),
});

export type RewriteResult = z.infer<typeof RewriteResultSchema>;

const ErrorBodySchema = z.object({ error: z.string() });

export class RewriteError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'RewriteError';
  }
}

export interface RewriteClient {
  rewrite(request: RewriteRequest, signal?: AbortSignal): Promise<RewriteResult>;
}

const STATUS_MESSAGES: Partial<Record<number, string>> = {
  413: 'That paragraph is too long to rewrite in one go. Split it first.',
  422: 'The model declined to rewrite this paragraph. Try rewording it yourself.',
  429: 'Too many rewrites in a short time. Wait a minute and try again.',
};

export function createRewriteClient(
  baseUrl: string = import.meta.env.VITE_REWRITE_API_URL ?? 'https://localhost:8787',
  fetchImpl: typeof fetch = fetch,
): RewriteClient {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/rewrite`;
  return {
    async rewrite(request, signal) {
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal,
        });
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new RewriteError(
          'Could not reach the rewrite server. Check your connection and try again.',
        );
      }

      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const serverMessage = ErrorBodySchema.safeParse(body).data?.error;
        throw new RewriteError(
          STATUS_MESSAGES[response.status] ?? serverMessage ?? 'The rewrite failed. Try again.',
          response.status,
        );
      }
      const result = RewriteResultSchema.safeParse(body);
      if (!result.success)
        throw new RewriteError('The rewrite server sent an unexpected response. Try again.');
      return result.data;
    },
  };
}
