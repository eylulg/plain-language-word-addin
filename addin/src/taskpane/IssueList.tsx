import { countIssues } from "@/analysis/analyze";
import { ISSUE_LABELS, ISSUE_TYPES, type Issue, type ParagraphAnalysis } from "@/analysis/types";
import { CARD } from "./styles";

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
      {withIssues.map((paragraph) => (
        <section
          key={paragraph.index}
          aria-labelledby={`paragraph-${paragraph.index}-heading`}
          className={`${CARD} p-3`}
        >
          <h3 id={`paragraph-${paragraph.index}-heading`} className="text-sm font-semibold text-primary">
            Paragraph {paragraph.index + 1}
          </h3>
          <p className="mt-0.5 text-xs text-tertiary">{summary(paragraph.issues)}</p>
          <p className="mt-1 text-xs text-quaternary italic">{preview(paragraph.text)}</p>
          <ul className="mt-2 flex flex-col gap-1">
            {paragraph.issues.map((issue) => (
              <IssueItem key={issue.id} issue={issue} onSelect={onSelect} />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

function IssueItem({ issue, onSelect }: { issue: Issue; onSelect: (issue: Issue) => void }) {
  const label = ISSUE_LABELS[issue.type];
  // Two paragraphs can share an issue text, so the position keeps every button name unique.
  const accessibleName = [
    `${label} in paragraph ${issue.paragraphIndex + 1}, sentence ${issue.sentenceIndex + 1}:`,
    issue.message,
    issue.suggestion,
  ]
    .filter(Boolean)
    .join(" ");

  function handleClick() {
    onSelect(issue);
  }

  return (
    <li>
      <button
        type="button"
        aria-label={accessibleName}
        onClick={handleClick}
        className="w-full rounded-lg px-2 py-1.5 text-left outline-focus-ring transition hover:bg-primary_hover focus-visible:outline-2"
      >
        <span className="block text-xs font-semibold text-brand-secondary">{label}</span>
        <span className="block text-sm text-secondary">{issue.message}</span>
        {issue.suggestion && <span className="block text-xs text-tertiary">{issue.suggestion}</span>}
      </button>
    </li>
  );
}
