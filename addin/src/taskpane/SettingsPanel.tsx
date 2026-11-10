import { Card, CardBody } from "@eylulg/ui/card";
import { Select, SelectItem } from "@eylulg/ui/select";
import { Textarea } from "@eylulg/ui/textarea";
import type { Key } from "react-aria-components";
import { TONES } from "@/api/rewrite-client";
import { MODEL_OPTIONS, type Settings } from "./settings";

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
  function handleGradeChange(key: Key | null) {
    if (key !== null) onChange({ targetGrade: Number(key) });
  }

  function handleToneChange(key: Key | null) {
    const tone = TONES.find((t) => t === key);
    if (tone) onChange({ tone });
  }

  function handleModelChange(key: Key | null) {
    const model = MODEL_OPTIONS.find((m) => m.value === key)?.value;
    if (model !== undefined) onChange({ model });
  }

  function handleTermsChange(protectedTerms: string) {
    onChange({ protectedTerms });
  }

  return (
    <Card>
      <details>
        <summary className="cursor-pointer rounded-xs text-sm font-semibold text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          Settings
        </summary>
        <CardBody className="mt-3 flex flex-col gap-4">
          <Select
            label="Target grade level"
            selectedKey={String(settings.targetGrade)}
            onSelectionChange={handleGradeChange}
            items={GRADE_OPTIONS}
          >
            {(option) => <SelectItem id={option.value}>{option.label}</SelectItem>}
          </Select>
          <Select
            label="Tone"
            selectedKey={settings.tone}
            onSelectionChange={handleToneChange}
            items={TONE_OPTIONS}
          >
            {(option) => <SelectItem id={option.value}>{option.label}</SelectItem>}
          </Select>
          <Select
            label="Model"
            selectedKey={settings.model}
            onSelectionChange={handleModelChange}
            items={MODEL_SELECT_OPTIONS}
          >
            {(option) => <SelectItem id={option.value}>{option.label}</SelectItem>}
          </Select>
          <Textarea
            label="Protected terms"
            hint="One per line. These are kept exactly as written."
            rows={3}
            value={settings.protectedTerms}
            onChange={handleTermsChange}
          />
        </CardBody>
      </details>
    </Card>
  );
}
