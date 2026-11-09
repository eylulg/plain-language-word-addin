import { useCallback, useState } from "react";
import { TONES, type Tone } from "@/api/rewrite-client";

export interface Settings {
  targetGrade: number;
  tone: Tone;
  /** Empty string means the server default. */
  model: string;
  /** One protected term per line. */
  protectedTerms: string;
}

export const DEFAULT_SETTINGS: Settings = {
  targetGrade: 8,
  tone: "neutral",
  model: "",
  protectedTerms: "",
};

export const MODEL_OPTIONS = [
  { value: "", label: "Server default" },
  { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (balanced)" },
  { value: "claude-haiku-5-5", label: "Claude Haiku 5.5 (fastest)" },
  { value: "claude-opus-5-5", label: "Claude Opus 5.5 (most careful)" },
] as const;

const STORAGE_KEY = "plain-language:settings";

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
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      targetGrade:
        typeof parsed.targetGrade === "number" && parsed.targetGrade >= 3 && parsed.targetGrade <= 16
          ? parsed.targetGrade
          : DEFAULT_SETTINGS.targetGrade,
      tone: TONES.includes(parsed.tone as Tone) ? (parsed.tone as Tone) : DEFAULT_SETTINGS.tone,
      model: MODEL_OPTIONS.some((m) => m.value === parsed.model) ? (parsed.model as string) : "",
      protectedTerms: typeof parsed.protectedTerms === "string" ? parsed.protectedTerms : "",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      try {
        globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage can be blocked inside Office webviews; settings then last for the session.
      }
      return next;
    });
  }, []);
  return [settings, update];
}
