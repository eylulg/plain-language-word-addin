import { ISSUE_LABELS, ISSUE_TYPES, countIssues, type Issue, type ParagraphAnalysis } from "@/analysis";

interface IssueListProps {
  paragraphs: readonly ParagraphAnalysis[];
  onSelect: (issue: Issue) => void;
}

function preview(text: string, length = 70): string {
  return text.length <= length ? text : `${text.slice(0, length).replace(/\s+\S*$/, "")}...`;
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
      {withIssues.length === 0 ? (
        <p className="text-sm text-tertiary">No issues found. Nice and plain.</p>
      ) : (
        withIssues.map((paragraph) => {
          const headingId = `paragraph-${paragraph.index}-heading`;
          return (
            <section
              key={paragraph.index}
              aria-labelledby={headingId}
              className="rounded-xl bg-primary p-3 shadow-xs ring-1 ring-secondary"
            >
              <h3 id={headingId} className="text-sm font-semibold text-primary">
                Paragraph {paragraph.index + 1}
              </h3>
              <p className="mt-0.5 text-xs text-tertiary">{summary(paragraph.issues)}</p>
              <p className="mt-1 text-xs text-quaternary italic">{preview(paragraph.text)}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {paragraph.issues.map((issue) => (
                  <li key={issue.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(issue)}
                      className="w-full rounded-lg px-2 py-1.5 text-left outline-focus-ring transition hover:bg-primary_hover focus-visible:outline-2"
                    >
                      <span className="block text-xs font-semibold text-brand-secondary">
                        {ISSUE_LABELS[issue.type]}
                      </span>
                      <span className="block text-sm text-secondary">{issue.message}</span>
                      {issue.suggestion && (
                        <span className="block text-xs text-tertiary">{issue.suggestion}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </section>
  );
}
