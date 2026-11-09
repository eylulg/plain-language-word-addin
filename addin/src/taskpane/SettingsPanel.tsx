import { TONES, type Tone } from "@/api/rewrite-client";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { MODEL_OPTIONS, type Settings } from "./settings";

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

const GRADE_OPTIONS = Array.from({ length: 9 }, (_, i) => {
  const grade = i + 5;
  return { value: String(grade), label: `Grade ${grade}${grade === 8 ? " (recommended)" : ""}` };
});

const TONE_OPTIONS = TONES.map((tone) => ({
  value: tone,
  label: tone.charAt(0).toUpperCase() + tone.slice(1),
}));

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <details className="group rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
      <summary className="cursor-pointer text-sm font-semibold text-secondary">Settings</summary>
      <div className="mt-3 flex flex-col gap-4">
        <NativeSelect
          label="Target grade level"
          size="sm"
          value={String(settings.targetGrade)}
          options={GRADE_OPTIONS}
          onChange={(e) => onChange({ targetGrade: Number(e.target.value) })}
        />
        <NativeSelect
          label="Tone"
          size="sm"
          value={settings.tone}
          options={TONE_OPTIONS}
          onChange={(e) => onChange({ tone: e.target.value as Tone })}
        />
        <NativeSelect
          label="Model"
          size="sm"
          value={settings.model}
          options={MODEL_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
          onChange={(e) => onChange({ model: e.target.value })}
        />
        <TextArea
          label="Protected terms"
          hint="One per line. These are kept exactly as written."
          rows={3}
          size="sm"
          value={settings.protectedTerms}
          onChange={(value) => onChange({ protectedTerms: value })}
        />
      </div>
    </details>
  );
}
