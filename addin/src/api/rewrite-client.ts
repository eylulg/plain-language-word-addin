export const TONES = ["neutral", "friendly", "formal"] as const;
export type Tone = (typeof TONES)[number];

export interface RewriteRequest {
  text: string;
  targetGrade: number;
  tone: Tone;
  /** Leave out to use the server default model. */
  model?: string;
  protectedTerms: string[];
}

export interface RewriteResult {
  rewrite: string;
  changes: string[];
  warnings: string[];
  model: string;
  demo: boolean;
}

export class RewriteError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "RewriteError";
  }
}

export interface RewriteClient {
  rewrite(request: RewriteRequest, signal?: AbortSignal): Promise<RewriteResult>;
}

export const DEFAULT_API_URL: string = import.meta.env.VITE_REWRITE_API_URL ?? "https://localhost:8787";

function isRewriteResult(value: unknown): value is RewriteResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.rewrite === "string" && Array.isArray(v.changes) && typeof v.model === "string";
}

const STATUS_MESSAGES: Record<number, string> = {
  413: "That paragraph is too long to rewrite in one go. Split it first.",
  422: "The model declined to rewrite this paragraph.",
  429: "Too many rewrites in a short time. Wait a minute and try again.",
};

export function createRewriteClient(
  baseUrl: string = DEFAULT_API_URL,
  fetchImpl: typeof fetch = fetch,
): RewriteClient {
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/rewrite`;
  return {
    async rewrite(request, signal) {
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        throw new RewriteError("Could not reach the rewrite server. Check that it is running.");
      }

      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const serverMessage =
          typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : undefined;
        throw new RewriteError(
          STATUS_MESSAGES[response.status] ?? serverMessage ?? "The rewrite failed.",
          response.status,
        );
      }
      if (!isRewriteResult(body)) throw new RewriteError("The server sent an unexpected response.");
      return { ...body, warnings: body.warnings ?? [], demo: body.demo ?? false };
    },
  };
}
