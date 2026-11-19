import { themeStorageKey } from '@eylulg/ui/chrome';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OfficeThemeDefault } from '../OfficeThemeDefault';

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark-mode');
});

describe('OfficeThemeDefault', () => {
  it('follows Word without storing a choice', () => {
    render(<OfficeThemeDefault readDark={() => true} />);

    expect(document.documentElement).toHaveClass('dark-mode');
    expect(localStorage.getItem(themeStorageKey)).toBeNull();
  });

  it('ignores Word once the user has chosen a theme', () => {
    localStorage.setItem(themeStorageKey, 'light');

    render(<OfficeThemeDefault readDark={() => true} />);

    expect(document.documentElement).not.toHaveClass('dark-mode');
  });
});
