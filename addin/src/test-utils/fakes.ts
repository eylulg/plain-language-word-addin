import { vi } from "vitest";
import { createRewriteClient, type RewriteResult } from "@/api/rewrite-client";
import type { SelectedParagraph, WordGateway } from "@/office/types";

export const LONG_PARAGRAPH =
  "In the event that the tenant fails to make payment of the rent in accordance with the terms hereinafter set out, " +
  "the landlord shall be entitled to terminate the agreement forthwith and to recover possession of the premises.";

const DOCUMENT = ["Tenancy notice", LONG_PARAGRAPH, "Please call us if you have any questions."];

export const REWRITE: RewriteResult = {
  rewrite:
    "If the tenant does not pay the rent on time, the landlord can end the agreement at once and take back the home.",
  changes: ['Replaced "in the event that" with "if".'],
  warnings: [],
  model: "claude-sonnet-5-5",
  demo: false,
};

/** A stand-in for Word at the platform boundary, recording what the task pane asked for. */
export function createFakeGateway(overrides: Partial<WordGateway> = {}) {
  const selected: SelectedParagraph = { index: 1, text: LONG_PARAGRAPH };
  const gateway = {
    kind: "word" as const,
    readParagraphs: vi.fn(async () => [...DOCUMENT]),
    selectSentence: vi.fn(async () => true),
    highlightSentences: vi.fn(async (refs: readonly unknown[]) => refs.length),
    getSelectedParagraph: vi.fn(async (): Promise<SelectedParagraph | null> => selected),
    replaceParagraphAsTrackedChange: vi.fn(async () => undefined),
    supportsTrackedChanges: vi.fn(() => true),
  } satisfies WordGateway;
  return Object.assign(gateway, overrides);
}

/** The real rewrite client with only the network stubbed. */
export function createStubbedClient(respond: () => Response = () => Response.json(REWRITE)) {
  const fetchStub = vi.fn<typeof fetch>(async () => respond());
  return { client: createRewriteClient("https://api.test", fetchStub), fetchStub };
}

export function sentBody(fetchStub: ReturnType<typeof createStubbedClient>["fetchStub"]): unknown {
  const init = fetchStub.mock.calls.at(-1)?.[1];
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}
