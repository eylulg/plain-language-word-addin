import { vi } from "vitest";
import type { RewriteClient, RewriteResult } from "@/api/rewrite-client";
import type { SelectedParagraph, WordGateway } from "@/office";

export const LONG_PARAGRAPH =
  "In the event that the tenant fails to make payment of the rent in accordance with the terms hereinafter set out, " +
  "the landlord shall be entitled to terminate the agreement forthwith and to recover possession of the premises.";

export const DOCUMENT = ["Tenancy notice", LONG_PARAGRAPH, "Please call us if you have any questions."];

export const REWRITE: RewriteResult = {
  rewrite:
    "If the tenant does not pay the rent on time, the landlord can end the agreement at once and take back the home.",
  changes: ['Replaced "in the event that" with "if".', "Split one long sentence into plain words."],
  warnings: [],
  model: "claude-sonnet-5-5",
  demo: false,
};

export function createFakeGateway(overrides: Partial<WordGateway> = {}) {
  const selected: SelectedParagraph = { index: 1, text: LONG_PARAGRAPH };
  return {
    kind: "word" as const,
    readParagraphs: vi.fn(async () => [...DOCUMENT]),
    selectSentence: vi.fn(async () => true),
    highlightSentences: vi.fn(async (refs: readonly unknown[]) => refs.length),
    getSelectedParagraph: vi.fn(async () => selected),
    replaceParagraphAsTrackedChange: vi.fn(async () => undefined),
    supportsTrackedChanges: vi.fn(() => true),
    ...overrides,
  } satisfies WordGateway;
}

export function createFakeClient(result: RewriteResult = REWRITE) {
  return { rewrite: vi.fn<RewriteClient["rewrite"]>(async () => result) };
}
