import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL, loadConfig } from "../config.js";

describe("loadConfig", () => {
  it("runs in demo mode with safe defaults when nothing is set", () => {
    const config = loadConfig({});

    expect(config).toMatchObject({
      apiKey: undefined,
      defaultModel: DEFAULT_MODEL,
      effort: "low",
      allowedOrigins: ["https://localhost:3100"],
      maxBodyBytes: 16 * 1024,
      rateLimit: { windowMs: 60_000, max: 10 },
    });
  });

  it("reads overrides and always allows the default model", () => {
    const config = loadConfig({
      ANTHROPIC_API_KEY: " sk-test ",
      REWRITE_MODEL: "claude-opus-5-5",
      REWRITE_ALLOWED_MODELS: "claude-haiku-5-5",
      REWRITE_EFFORT: "medium",
      ALLOWED_ORIGINS: "https://a.example, https://b.example",
      RATE_LIMIT_PER_MINUTE: "3",
      MAX_BODY_KB: "8",
    });

    expect(config).toMatchObject({
      apiKey: "sk-test",
      defaultModel: "claude-opus-5-5",
      allowedModels: ["claude-opus-5-5", "claude-haiku-5-5"],
      effort: "medium",
      allowedOrigins: ["https://a.example", "https://b.example"],
      maxBodyBytes: 8 * 1024,
      rateLimit: { max: 3 },
    });
  });

  it("falls back per variable when a value is invalid", () => {
    const config = loadConfig({
      ANTHROPIC_API_KEY: "  ",
      RATE_LIMIT_PER_MINUTE: "-1",
      MAX_BODY_KB: "lots",
      REWRITE_EFFORT: "max",
    });

    expect(config).toMatchObject({
      apiKey: undefined,
      rateLimit: { max: 10 },
      maxBodyBytes: 16 * 1024,
      effort: "low",
    });
  });
});
