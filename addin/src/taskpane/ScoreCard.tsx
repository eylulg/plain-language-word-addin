import { ISSUE_LABELS, ISSUE_TYPES, type DocumentAnalysis } from "@/analysis/types";
import { Badge } from "@/components/base/badges/badges";
import { CARD } from "./styles";

interface ScoreCardProps {
  analysis: DocumentAnalysis;
  targetGrade: number;
}

export function ScoreCard({ analysis, targetGrade }: ScoreCardProps) {
  const { stats, issueCounts, label } = analysis;
  const gap = Math.round((stats.gradeLevel - targetGrade) * 10) / 10;
  const onTarget = gap <= 0;

  return (
    <section aria-labelledby="score-heading" className={`${CARD} p-4`}>
      <h2 id="score-heading" className="text-sm font-semibold text-secondary">
        Document score
      </h2>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="text-display-xs font-semibold text-primary">{stats.gradeLevel.toFixed(1)}</span>
          <span className="text-sm text-tertiary">grade level</span>
        </p>
        <Badge type="pill-color" color={onTarget ? "success" : "warning"} size="sm">
          {onTarget ? `At or below grade ${targetGrade}` : `${gap.toFixed(1)} above grade ${targetGrade}`}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Reading ease" value={stats.readingEase.toFixed(0)} />
        <Stat label="Words per sentence" value={stats.averageSentenceLength.toFixed(1)} />
        <Stat label="Words" value={stats.words} />
      </dl>
      <p className="mt-3 text-sm text-tertiary">
        Readability: <span className="font-medium text-secondary">{label}</span>
      </p>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Issues by type">
        {ISSUE_TYPES.map((type) => (
          <li key={type}>
            <Badge type="color" size="sm" color={issueCounts[type] > 0 ? "brand" : "gray"}>
              {ISSUE_LABELS[type]}: {issueCounts[type]}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-tertiary">{label}</dt>
      <dd className="text-sm font-semibold text-primary">{value}</dd>
    </div>
  );
}
