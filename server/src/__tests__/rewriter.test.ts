import { describe, expect, it } from "vitest";
import { buildUserMessage, SYSTEM_PROMPT } from "../prompt.js";
import { createClaudeRewriter, IncompleteRewriteError } from "../rewriter.js";
import type { RewriteRequest } from "../schema.js";
import { fakeAnthropic, testConfig } from "../test-utils/helpers.js";

const request: RewriteRequest = {
  text: "The tenant shall make payment of 1,200 euros per month to the Landlord prior to the 5th day of each month.",
  targetGrade: 8,
  tone: "neutral",
  protectedTerms: ["Landlord"],
};

describe("createClaudeRewriter", () => {
  it("asks the default model for structured output at low effort with refusal fallback", async () => {
    const { client, parse } = fakeAnthropic();

    await createClaudeRewriter(client, testConfig()).rewrite(request);

    const params = parse.mock.calls[0]?.[0];
    expect(params).toMatchObject({
      model: "claude-sonnet-5-5",
      max_tokens: 16_000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(request) }],
      output_config: { effort: "low", format: { type: "json_schema" } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  });

  it.each([
    ["the environment default", {}, testConfig({ defaultModel: "claude-opus-5-5" }), "claude-opus-5-5", true],
    ["the requested model", { model: "claude-haiku-5-5" }, testConfig(), "claude-haiku-5-5", false],
  ])(
    "uses %s, with fallback only where the model supports it",
    async (_name, extra, config, model, fallback) => {
      const { client, parse } = fakeAnthropic();

      await createClaudeRewriter(client, config).rewrite({ ...request, ...extra });

      const params = parse.mock.calls[0]?.[0];
      expect(params?.model).toBe(model);
      expect(params?.fallbacks === "default").toBe(fallback);
    },
  );

  it("returns the trimmed rewrite, non-empty notes and the model that answered", async () => {
    const { client } = fakeAnthropic({
      model: "claude-sonnet-5",
      parsed_output: {
        rewrite: " The tenant must pay 1,200 euros to the Landlord before the 5th of each month. ",
        changes: ['Turned "make payment" into "pay".', " "],
      },
    });

    const result = await createClaudeRewriter(client, testConfig()).rewrite(request);

    expect(result).toEqual({
      rewrite: "The tenant must pay 1,200 euros to the Landlord before the 5th of each month.",
      changes: ['Turned "make payment" into "pay".'],
      warnings: [],
      model: "claude-sonnet-5",
      demo: false,
    });
  });

  it("warns when a number or protected term goes missing", async () => {
    const { client } = fakeAnthropic({
      parsed_output: { rewrite: "Pay the landlord monthly.", changes: [] },
    });

    const result = await createClaudeRewriter(client, testConfig()).rewrite(request);

    expect(result.warnings).toEqual([
      'The number "1,200" from the original is not in the rewrite.',
      'The number "5" from the original is not in the rewrite.',
      'The protected term "Landlord" is not in the rewrite.',
    ]);
  });

  it("throws a refusal error that carries the category", async () => {
    const { client } = fakeAnthropic({
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: "cyber" },
    });

    await expect(createClaudeRewriter(client, testConfig()).rewrite(request)).rejects.toMatchObject({
      name: "RewriteRefusedError",
      category: "cyber",
    });
  });

  it.each([
    ["cut off at max_tokens", { stop_reason: "max_tokens" }],
    ["not parseable", { parsed_output: null }],
  ])("throws when the output was %s", async (_name, reply) => {
    const { client } = fakeAnthropic(reply);

    await expect(createClaudeRewriter(client, testConfig()).rewrite(request)).rejects.toBeInstanceOf(
      IncompleteRewriteError,
    );
  });
});
