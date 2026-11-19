import { diffWords } from '@/analysis/diff';

export function DiffView({ before, after }: { before: string; after: string }) {
  const parts = diffWords(before, after);

  return (
    <p className='rounded-lg bg-secondary p-3 font-data text-sm leading-6 text-primary'>
      {parts.map((part, i) => {
        if (part.op === 'insert') {
          return (
            <ins
              key={i}
              className='font-medium text-success underline decoration-2 underline-offset-2'
            >
              <span className='sr-only'>added: </span>
              {part.text}
            </ins>
          );
        }
        if (part.op === 'delete') {
          return (
            <del key={i} className='text-error line-through'>
              <span className='sr-only'>removed: </span>
              {part.text}
            </del>
          );
        }
        return <span key={i}>{part.text}</span>;
      })}
    </p>
  );
}
