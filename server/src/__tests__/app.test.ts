import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { createClaudeRewriter } from "../rewriter.js";
import {
  fakeAnthropic,
  MODEL_REPLY,
  ORIGIN,
  postRewrite,
  testConfig,
  VALID_BODY,
} from "../test-utils/helpers.js";

function appWith(overrides: Parameters<typeof testConfig>[0] = {}, sdk = fakeAnthropic()) {
  const config = testConfig(overrides);
  return { app: createApp({ config, rewriter: createClaudeRewriter(sdk.client, config) }), sdk };
}

describe("POST /rewrite", () => {
  it("returns the rewrite for a valid request", async () => {
    const { app } = appWith();

    const res = await app.request(postRewrite({ ...VALID_BODY, protectedTerms: [" Friday "] }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      rewrite: MODEL_REPLY.parsed_output.rewrite,
      changes: MODEL_REPLY.parsed_output.changes,
      warnings: [],
      model: "claude-sonnet-5-5",
      demo: false,
    });
  });

  it.each([
    ["empty text", { ...VALID_BODY, text: "   " }, {}],
    ["a grade out of range", { ...VALID_BODY, targetGrade: 40 }, {}],
    ["an unknown tone", { ...VALID_BODY, tone: "angry" }, {}],
    ["a model not on the allow list", { ...VALID_BODY, model: "some-other-model" }, {}],
    ["text over the character limit", VALID_BODY, { maxTextChars: 10 }],
    ["a body that is not JSON", "{oops", {}],
  ])("rejects %s with 400 without calling the model", async (_name, body, overrides) => {
    const { app, sdk } = appWith(overrides);

    const res = await app.request(postRewrite(body));

    expect(res.status).toBe(400);
    expect(sdk.parse).not.toHaveBeenCalled();
  });

  it("rejects a body over the size cap with 413", async () => {
    const { app } = appWith({ maxBodyBytes: 100 });

    const res = await app.request(postRewrite({ ...VALID_BODY, text: "a ".repeat(200) }));

    expect(res.status).toBe(413);
  });

  it.each([
    [
      "a refusal",
      { reply: { stop_reason: "refusal", stop_details: { type: "refusal", category: "cyber" } } },
      422,
    ],
    [
      "an API rate limit",
      { error: new Anthropic.RateLimitError(429, undefined, "rate limited", new Headers()) },
      503,
    ],
    [
      "a bad API key",
      { error: new Anthropic.AuthenticationError(401, undefined, "bad key sk-123", new Headers()) },
      500,
    ],
    [
      "an API outage",
      { error: Anthropic.APIError.generate(529, undefined, "overloaded", new Headers()) },
      502,
    ],
    ["an unknown error", { error: new Error("boom") }, 500],
  ])("maps %s to %i without leaking details", async (_name, outcome, status) => {
    const sdk = fakeAnthropic("reply" in outcome ? outcome.reply : {});
    if ("error" in outcome) sdk.parse.mockRejectedValueOnce(outcome.error);
    const { app } = appWith({}, sdk);

    const res = await app.request(postRewrite(VALID_BODY));

    expect(res.status).toBe(status);
    expect(JSON.stringify(await res.json())).not.toMatch(/boom|sk-123|overloaded|rate limited/);
  });
});

describe("rate limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("limits each client per window and resets after it", async () => {
    const { app } = appWith({ rateLimit: { windowMs: 60_000, max: 2 } });
    const from = (ip: string) => app.request(postRewrite(VALID_BODY, { "x-forwarded-for": ip }));
    await from("1.1.1.1");
    await from("1.1.1.1");

    const limited = await from("1.1.1.1");
    const otherClient = await from("2.2.2.2");
    vi.advanceTimersByTime(60_000);
    const afterWindow = await from("1.1.1.1");

    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    expect(otherClient.status).toBe(200);
    expect(afterWindow.status).toBe(200);
  });
});

describe("CORS", () => {
  it.each([
    ["the add-in origin", ORIGIN, ORIGIN],
    ["another origin", "https://evil.example", null],
  ])("answers a preflight from %s", async (_name, origin, allowed) => {
    const { app } = appWith();

    const res = await app.request("http://server.test/rewrite", {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(allowed);
  });
});

describe("demo mode", () => {
  it("serves fixture rewrites when no API key is set", async () => {
    const app = createApp({ config: testConfig({ apiKey: undefined }) });

    const res = await app.request(postRewrite(VALID_BODY));

    expect(await res.json()).toMatchObject({ demo: true, rewrite: "Make payment before Friday." });
  });
});
