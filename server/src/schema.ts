import { z } from "zod";

const TONES = ["neutral", "friendly", "formal"] as const;
export type Tone = (typeof TONES)[number];

export function rewriteRequestSchema(maxTextChars: number) {
  return z.object({
    text: z
      .string()
      .trim()
      .min(1, "Text is empty.")
      .max(maxTextChars, `Text is longer than ${maxTextChars} characters.`),
    targetGrade: z.number().int().min(3).max(16),
    tone: z.enum(TONES),
    model: z.string().trim().min(1).optional(),
    protectedTerms: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  });
}

export type RewriteRequest = z.infer<ReturnType<typeof rewriteRequestSchema>>;

/** The structured output Claude is asked to return. */
export const ModelRewriteSchema = z.object({
  rewrite: z.string(),
  changes: z.array(z.string()),
});

export interface RewriteResponse {
  rewrite: string;
  changes: string[];
  /** Things the server noticed, such as a number that went missing. */
  warnings: string[];
  model: string;
  demo: boolean;
}
