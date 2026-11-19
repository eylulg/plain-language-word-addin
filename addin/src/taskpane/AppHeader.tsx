import { BrandMark, ThemeToggle } from '@eylulg/ui/chrome';

export function AppHeader({ isPreview }: { isPreview: boolean }) {
  return (
    <header className='flex items-center justify-between gap-2 border-b border-subtle px-4 py-2'>
      <div className='flex min-w-0 items-center gap-2'>
        <BrandMark size={24} />
        <div className='min-w-0'>
          <h1 className='truncate text-sm font-semibold text-primary'>Plain Language</h1>
          {isPreview && (
            <p className='text-xs text-tertiary'>Browser preview with a sample document</p>
          )}
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}
