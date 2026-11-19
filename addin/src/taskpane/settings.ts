import { useState } from 'react';
import { z } from 'zod';
import { TONES } from '@/api/rewrite-client';

export const MODEL_OPTIONS = [
  { value: '', label: 'Server default' },
  { value: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (balanced)' },
  { value: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (fastest)' },
  { value: 'claude-opus-5-5', label: 'Claude Opus 5.5 (most careful)' },
] as const;

const MODEL_VALUES = ['', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5'] as const;

export const DEFAULT_SETTINGS = {
  targetGrade: 8,
  tone: 'neutral',
  model: '',
  protectedTerms: '',
} as const satisfies z.input<typeof SettingsSchema>;

/** Each field falls back on its own, so one bad stored value does not reset the rest. */
const SettingsSchema = z.object({
  targetGrade: z.number().int().min(3).max(16).catch(8),
  tone: z.enum(TONES).catch('neutral'),
  /** Empty string means the server default. */
  model: z.enum(MODEL_VALUES).catch(''),
  /** One protected term per line. */
  protectedTerms: z.string().catch(''),
});

export type Settings = z.infer<typeof SettingsSchema>;

const STORAGE_KEY = 'plain-language:settings';

export function parseProtectedTerms(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return SettingsSchema.parse(raw ? JSON.parse(raw) : DEFAULT_SETTINGS);
  } catch {
    return SettingsSchema.parse(DEFAULT_SETTINGS);
  }
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be blocked inside Office webviews; settings then last for the session.
  }
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  function updateSettings(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  }

  return [settings, updateSettings];
}
