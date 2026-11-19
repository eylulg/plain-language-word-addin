import Anthropic from '@anthropic-ai/sdk';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import type { ServerConfig } from './config.js';
import { createDemoRewriter } from './demo-rewriter.js';
import { rateLimit, type ClientKey } from './rate-limit.js';
import {
  createAnthropicClient,
  createClaudeRewriter,
  IncompleteRewriteError,
  RewriteRefusedError,
  type Rewriter,
} from './rewriter.js';
import { rewriteRequestSchema } from './schema.js';

export interface AppOptions {
  config: ServerConfig;
  /** Defaults to Claude when an API key is set, otherwise the demo rewriter. */
  rewriter?: Rewriter;
  clientKey?: ClientKey;
  /** Receives failed rewrites for logging. It never gets the paragraph text. */
  onError?: (error: unknown) => void;
}

function createRewriter(config: ServerConfig): Rewriter {
  return config.apiKey
    ? createClaudeRewriter(createAnthropicClient(config.apiKey), config)
    : createDemoRewriter();
}

function errorResponse(error: unknown): { status: 422 | 500 | 502 | 503; message: string } {
  if (error instanceof RewriteRefusedError) return { status: 422, message: error.message };
  if (error instanceof IncompleteRewriteError) return { status: 502, message: error.message };
  if (error instanceof Anthropic.RateLimitError)
    return { status: 503, message: 'The model is busy. Try again shortly.' };
  if (error instanceof Anthropic.AuthenticationError)
    return { status: 500, message: 'The server is not configured correctly.' };
  if (error instanceof Anthropic.APIError)
    return { status: 502, message: 'The model could not complete the rewrite.' };
  return { status: 500, message: 'Unexpected server error.' };
}

export function createApp({
  config,
  rewriter = createRewriter(config),
  clientKey,
  onError,
}: AppOptions) {
  const app = new Hono();
  const requestSchema = rewriteRequestSchema(config.maxTextChars);

  app.use(
    '*',
    cors({
      origin: [...config.allowedOrigins],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
      maxAge: 600,
    }),
  );

  app.get('/health', (c) => c.json({ ok: true, demo: !config.apiKey, model: config.defaultModel }));

  app.post(
    '/rewrite',
    rateLimit({ ...config.rateLimit, key: clientKey }),
    bodyLimit({
      maxSize: config.maxBodyBytes,
      onError: (c) => c.json({ error: 'Request body is too large.' }, 413),
    }),
    async (c) => {
      const body: unknown = await c.req.json().catch(() => undefined);
      const parsed = requestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, 400);
      }
      const request = parsed.data;
      if (request.model && !config.allowedModels.includes(request.model)) {
        return c.json({ error: `Model "${request.model}" is not allowed on this server.` }, 400);
      }

      try {
        return c.json(await rewriter.rewrite(request));
      } catch (error) {
        onError?.(error);
        const { status, message } = errorResponse(error);
        return c.json({ error: message }, status);
      }
    },
  );

  app.notFound((c) => c.json({ error: 'Not found.' }, 404));
  return app;
}
