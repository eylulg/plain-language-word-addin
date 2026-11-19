import { projectHref, projects } from '@eylulg/ui/projects';

const portfolio = projects.find((project) => project.id === 'portfolio');

export function AppFooter() {
  if (!portfolio) return null;

  return (
    <footer className='border-t border-subtle bg-secondary px-4 py-2 text-xs'>
      <a
        href={projectHref(portfolio)}
        target='_blank'
        rel='noreferrer'
        className='rounded-xs text-tertiary underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'
      >
        More projects
      </a>
    </footer>
  );
}
