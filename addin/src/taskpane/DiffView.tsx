import { diffWords } from "@/analysis";

export function DiffView({ before, after }: { before: string; after: string }) {
  const parts = diffWords(before, after);
  return (
    <p className="rounded-lg bg-secondary p-3 text-sm leading-6 text-primary" data-testid="diff">
      {parts.map((part, i) => {
        if (part.op === "equal") return <span key={i}>{part.text}</span>;
        if (part.op === "insert") {
          return (
            <ins key={i} className="rounded-sm bg-success-secondary text-success-primary no-underline">
              <span className="sr-only">added: </span>
              {part.text}
            </ins>
          );
        }
        return (
          <del key={i} className="rounded-sm bg-error-secondary text-error-primary">
            <span className="sr-only">removed: </span>
            {part.text}
          </del>
        );
      })}
    </p>
  );
}
