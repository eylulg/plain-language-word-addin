import { Badge } from "@eylulg/ui/badge";
import { Card, CardBody } from "@eylulg/ui/card";
import { countIssues } from "@/analysis/analyze";
import { ISSUE_LABELS, ISSUE_TYPES, type Issue, type ParagraphAnalysis } from "@/analysis/types";

interface IssueListProps {
  paragraphs: readonly ParagraphAnalysis[];
  onSelect: (issue: Issue) => void;
}

const PREVIEW_LENGTH = 70;

function preview(text: string): string {
  return text.length <= PREVIEW_LENGTH ? text : `${text.slice(0, PREVIEW_LENGTH).replace(/\s+\S*$/, "")}...`;
}

function summary(issues: readonly Issue[]): string {
  const counts = countIssues(issues);
  return ISSUE_TYPES.filter((type) => counts[type] > 0)
    .map((type) => `${counts[type]} ${ISSUE_LABELS[type].toLowerCase()}`)
    .join(", ");
}

export function IssueList({ paragraphs, onSelect }: IssueListProps) {
  const withIssues = paragraphs.filter((p) => p.issues.length > 0);

  return (
    <section aria-labelledby="issues-heading" className="flex flex-col gap-3">
      <h2 id="issues-heading" className="text-sm font-semibold text-secondary">
        Issues by paragraph
      </h2>
      {withIssues.length === 0 && <p className="text-sm text-tertiary">No issues found. Nice and plain.</p>}
      {withIssues.map((paragraph, position) => (
        <Card key={paragraph.index} role="region" aria-label={`Paragraph ${paragraph.index + 1}`}>
          <details open={position === 0}>
            <summary className="cursor-pointer rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
              <span className="text-sm font-semibold text-primary">{`Paragraph ${paragraph.index + 1}`}</span>
              <span className="block text-xs text-tertiary">{summary(paragraph.issues)}</span>
            </summary>
            <CardBody className="mt-3 flex flex-col gap-2">
              <p className="text-xs text-tertiary italic">{preview(paragraph.text)}</p>
              <ul className="flex flex-col gap-1">
                {paragraph.issues.map((issue) => (
                  <IssueItem key={issue.id} issue={issue} onSelect={onSelect} />
                ))}
              </ul>
            </CardBody>
          </details>
        </Card>
      ))}
    </section>
  );
}

function IssueItem({ issue, onSelect }: { issue: Issue; onSelect: (issue: Issue) => void }) {
  const label = ISSUE_LABELS[issue.type];
  function handleClick() {
    onSelect(issue);
  }

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full flex-col items-start gap-1 rounded-lg px-2 py-1.5 text-left hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Badge size="sm" color="brand">
          {label}
        </Badge>{" "}
        {/* Two paragraphs can share an issue text, so the position keeps every button name unique. */}
        <span className="sr-only">
          {`in paragraph ${issue.paragraphIndex + 1}, sentence ${issue.sentenceIndex + 1}:`}
        </span>{" "}
        <span className="block text-sm text-secondary">{issue.message}</span>{" "}
        {issue.suggestion && <span className="block text-xs text-tertiary">{issue.suggestion}</span>}
      </button>
    </li>
  );
}
