import type Anthropic from '@anthropic-ai/sdk';
import { vi } from 'vitest';
import { loadConfig, type ServerConfig } from '../config.js';

export const ORIGIN = 'https://localhost:3100';

export const VALID_BODY = {
  text: 'Make payment prior to Friday.',
  targetGrade: 8,
  tone: 'neutral',
  protectedTerms: [],
};

export const MODEL_REPLY = {
  model: 'claude-sonnet-5-5',
  stop_reason: 'end_turn',
  stop_details: null,
  parsed_output: { rewrite: 'Pay before Friday.', changes: ['Replaced "prior to" with "before".'] },
};

export function testConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return { ...loadConfig({ ANTHROPIC_API_KEY: 'test-key' }), ...overrides };
}

/** Stands in for the Anthropic SDK at the network boundary. Only `beta.messages.parse` is used. */
export function fakeAnthropic(reply: Record<string, unknown> = {}) {
  const parse = vi.fn(async (_params: Record<string, unknown>) => ({ ...MODEL_REPLY, ...reply }));
  return { client: { beta: { messages: { parse } } } as unknown as Anthropic, parse };
}

export function postRewrite(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://server.test/rewrite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
