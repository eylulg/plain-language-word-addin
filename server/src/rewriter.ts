import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { findPreservationWarnings } from "./checks.js";
import type { ServerConfig } from "./config.js";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt.js";
import { ModelRewriteSchema, type RewriteRequest, type RewriteResponse } from "./schema.js";

export interface Rewriter {
  rewrite(request: RewriteRequest): Promise<RewriteResponse>;
}

export class RewriteRefusedError extends Error {
  constructor(readonly category: string | null) {
    super("The model declined to rewrite this paragraph.");
    this.name = "RewriteRefusedError";
  }
}

export class IncompleteRewriteError extends Error {
  constructor(readonly stopReason: string | null) {
    super("The model did not return a complete rewrite.");
    this.name = "IncompleteRewriteError";
  }
}

/**
 * Models that accept server-side refusal fallback with `fallbacks: "default"`.
 * A declined request is retried on Anthropic's recommended fallback model in the same call.
 */
const FALLBACK_MODELS = new Set([
  "claude-sonnet-5-5",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-fable-5-1",
]);
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** Rewrites are short, but adaptive thinking shares this budget, so leave headroom. */
const MAX_TOKENS = 16_000;
const MAX_CHANGES = 6;

export function createClaudeRewriter(client: Anthropic, config: ServerConfig): Rewriter {
  return {
    async rewrite(request) {
      const model = request.model ?? config.defaultModel;
      const fallback = FALLBACK_MODELS.has(model)
        ? { betas: [FALLBACK_BETA], fallbacks: "default" as const }
        : {};

      const message = await client.beta.messages.parse({
        model,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage(request) }],
        output_config: { effort: config.effort, format: betaZodOutputFormat(ModelRewriteSchema) },
        ...fallback,
      });

      if (message.stop_reason === "refusal") {
        throw new RewriteRefusedError(message.stop_details?.category ?? null);
      }
      const parsed = message.parsed_output;
      if (message.stop_reason === "max_tokens" || !parsed || parsed.rewrite.trim() === "") {
        throw new IncompleteRewriteError(message.stop_reason);
      }

      const rewrite = parsed.rewrite.trim();
      return {
        rewrite,
        changes: parsed.changes
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, MAX_CHANGES),
        warnings: findPreservationWarnings(request.text, rewrite, request.protectedTerms),
        model: message.model,
        demo: false,
      };
    },
  };
}

export function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, timeout: 60_000, maxRetries: 2 });
}
