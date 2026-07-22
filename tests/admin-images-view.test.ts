import { describe, expect, it } from 'vitest';
import { getResourceCopyPath } from '../src/scripts/admin-images/view';

describe('admin image resource copy path', () => {
  it('makes essay assets relative to the essay content root', () => {
    expect(getResourceCopyPath('src/content/essay/guide-assets/hero.webp'))
      .toBe('./guide-assets/hero.webp');
    expect(getResourceCopyPath('/src/content/essay/guide-assets/hero.webp'))
      .toBe('./guide-assets/hero.webp');
  });

  it('leaves non-essay asset paths unchanged', () => {
    expect(getResourceCopyPath('public/images/hero.webp')).toBe('public/images/hero.webp');
    expect(getResourceCopyPath('src/content/memo/hero.webp')).toBe('src/content/memo/hero.webp');
  });
});
