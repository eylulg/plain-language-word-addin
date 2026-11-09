import { describe, expect, it, vi } from "vitest";
import { createRewriteClient, RewriteError, type RewriteRequest } from "./rewrite-client";

const request: RewriteRequest = {
  text: "Prior to the start.",
  targetGrade: 8,
  tone: "neutral",
  protectedTerms: [],
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("createRewriteClient", () => {
  it("posts the request to /rewrite and returns the result", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { rewrite: "Before the start.", changes: ["Plainer"], model: "m", demo: false }),
    );
    const client = createRewriteClient("https://api.test/", fetchMock);
    const result = await client.rewrite(request);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/rewrite",
      expect.objectContaining({ method: "POST", body: JSON.stringify(request) }),
    );
    expect(result).toEqual({
      rewrite: "Before the start.",
      changes: ["Plainer"],
      warnings: [],
      model: "m",
      demo: false,
    });
  });

  it("maps rate limits to a friendly message", async () => {
    const client = createRewriteClient("https://api.test", async () => jsonResponse(429, { error: "rate" }));
    await expect(client.rewrite(request)).rejects.toMatchObject({
      status: 429,
      message: expect.stringMatching(/Wait a minute/),
    });
  });

  it("uses the server error message for other failures", async () => {
    const client = createRewriteClient("https://api.test", async () =>
      jsonResponse(400, { error: "Text is empty." }),
    );
    await expect(client.rewrite(request)).rejects.toThrow("Text is empty.");
  });

  it("reports network failures", async () => {
    const client = createRewriteClient("https://api.test", async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(client.rewrite(request)).rejects.toBeInstanceOf(RewriteError);
  });

  it("rejects malformed responses", async () => {
    const client = createRewriteClient("https://api.test", async () => jsonResponse(200, { nope: true }));
    await expect(client.rewrite(request)).rejects.toThrow("unexpected response");
  });
});
