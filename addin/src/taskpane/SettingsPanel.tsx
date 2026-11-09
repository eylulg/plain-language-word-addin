import type { ChangeEvent } from "react";
import { TONES } from "@/api/rewrite-client";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { MODEL_OPTIONS, type Settings } from "./settings";
import { CARD } from "./styles";

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

const GRADE_OPTIONS = Array.from({ length: 9 }, (_, i) => ({
  value: String(i + 5),
  label: i + 5 === 8 ? "Grade 8 (recommended)" : `Grade ${i + 5}`,
}));

const TONE_OPTIONS = TONES.map((tone) => ({
  value: tone,
  label: tone.charAt(0).toUpperCase() + tone.slice(1),
}));

const MODEL_SELECT_OPTIONS = MODEL_OPTIONS.map((m) => ({ value: m.value, label: m.label }));

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  function handleGradeChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange({ targetGrade: Number(event.target.value) });
  }

  function handleToneChange(event: ChangeEvent<HTMLSelectElement>) {
    const tone = TONES.find((t) => t === event.target.value);
    if (tone) onChange({ tone });
  }

  function handleModelChange(event: ChangeEvent<HTMLSelectElement>) {
    const model = MODEL_OPTIONS.find((m) => m.value === event.target.value)?.value;
    if (model !== undefined) onChange({ model });
  }

  function handleTermsChange(protectedTerms: string) {
    onChange({ protectedTerms });
  }

  return (
    <details className={`${CARD} p-4`}>
      <summary className="cursor-pointer text-sm font-semibold text-secondary">Settings</summary>
      <div className="mt-3 flex flex-col gap-4">
        <NativeSelect
          label="Target grade level"
          size="sm"
          value={String(settings.targetGrade)}
          options={GRADE_OPTIONS}
          onChange={handleGradeChange}
        />
        <NativeSelect
          label="Tone"
          size="sm"
          value={settings.tone}
          options={TONE_OPTIONS}
          onChange={handleToneChange}
        />
        <NativeSelect
          label="Model"
          size="sm"
          value={settings.model}
          options={MODEL_SELECT_OPTIONS}
          onChange={handleModelChange}
        />
        <TextArea
          label="Protected terms"
          hint="One per line. These are kept exactly as written."
          rows={3}
          size="sm"
          value={settings.protectedTerms}
          onChange={handleTermsChange}
        />
      </div>
    </details>
  );
}
