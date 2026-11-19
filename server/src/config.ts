import { z } from 'zod';

export type Env = Record<string, string | undefined>;

export const DEFAULT_MODEL = 'claude-sonnet-5-5';
const DEFAULT_ALLOWED_MODELS = ['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5'];
const DEFAULT_ORIGINS = ['https://localhost:3100'];

const commaList = (fallback: string[]) =>
  z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string()).min(1))
    .catch(fallback);

const positiveInt = (fallback: number) => z.coerce.number().int().positive().catch(fallback);

/** Every variable falls back on its own, so one typo does not stop the server. */
const EnvSchema = z.object({
  /** Unset means demo mode: no calls to Claude, fixture rewrites only. */
  ANTHROPIC_API_KEY: z.string().trim().min(1).optional().catch(undefined),
  REWRITE_MODEL: z.string().trim().min(1).catch(DEFAULT_MODEL),
  REWRITE_ALLOWED_MODELS: commaList(DEFAULT_ALLOWED_MODELS),
  REWRITE_EFFORT: z.enum(['low', 'medium', 'high']).catch('low'),
  ALLOWED_ORIGINS: commaList(DEFAULT_ORIGINS),
  RATE_LIMIT_PER_MINUTE: positiveInt(10),
  MAX_BODY_KB: positiveInt(16),
  MAX_TEXT_CHARS: positiveInt(4000),
});

export function loadConfig(env: Env) {
  const parsed = EnvSchema.parse(env);
  return {
    apiKey: parsed.ANTHROPIC_API_KEY,
    defaultModel: parsed.REWRITE_MODEL,
    /** The default model is always allowed. */
    allowedModels: [...new Set([parsed.REWRITE_MODEL, ...parsed.REWRITE_ALLOWED_MODELS])],
    allowedOrigins: parsed.ALLOWED_ORIGINS,
    effort: parsed.REWRITE_EFFORT,
    maxBodyBytes: parsed.MAX_BODY_KB * 1024,
    maxTextChars: parsed.MAX_TEXT_CHARS,
    rateLimit: { windowMs: 60_000, max: parsed.RATE_LIMIT_PER_MINUTE },
  };
}

export type ServerConfig = ReturnType<typeof loadConfig>;
