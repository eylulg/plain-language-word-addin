import { Badge } from "@eylulg/ui/badge";
import { Card, CardBody, CardHeader } from "@eylulg/ui/card";
import { ProgressBar } from "@eylulg/ui/progress-bar";
import { Stat } from "@eylulg/ui/stat";
import { ISSUE_LABELS, ISSUE_TYPES, type DocumentAnalysis } from "@/analysis/types";

interface ScoreCardProps {
  analysis: DocumentAnalysis;
  targetGrade: number;
}

export function ScoreCard({ analysis, targetGrade }: ScoreCardProps) {
  const { stats, issueCounts, label } = analysis;
  const gap = Math.round((stats.gradeLevel - targetGrade) * 10) / 10;
  const onTarget = gap <= 0;
  const readingEase = Math.min(100, Math.max(0, Math.round(stats.readingEase)));

  return (
    <Card role="region" aria-label="Document score">
      <CardHeader title="Document score" headingLevel={2} />
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Stat label="Grade level" value={stats.gradeLevel.toFixed(1)} />
          <Badge color={onTarget ? "success" : "warning"} size="sm">
            {onTarget ? `At or below grade ${targetGrade}` : `${gap.toFixed(1)} above grade ${targetGrade}`}
          </Badge>
        </div>
        <ProgressBar
          label="Reading ease"
          value={readingEase}
          size="sm"
          tone={onTarget ? "success" : "warning"}
        />
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Words per sentence" value={stats.averageSentenceLength.toFixed(1)} />
          <Stat label="Words" value={stats.words} />
        </div>
        <p className="text-tertiary">
          Readability: <span className="font-medium text-secondary">{label}</span>
        </p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Issues by type">
          {ISSUE_TYPES.map((type) => (
            <li key={type}>
              <Badge size="sm" color={issueCounts[type] > 0 ? "brand" : "gray"}>
                {ISSUE_LABELS[type]}: {issueCounts[type]}
              </Badge>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
