import { describe, expect, it } from 'vitest';
import { getSearchSnippets } from '../src/utils/search-snippets';

describe('getSearchSnippets', () => {
  it('returns every separated occurrence in one document', () => {
    const snippets = getSearchSnippets(`alpha ${'x'.repeat(40)} alpha ${'y'.repeat(40)} alpha`, ['alpha'], 8);
    expect(snippets).toHaveLength(3);
    expect(snippets.every((snippet) => snippet.includes('alpha'))).toBe(true);
  });

  it('merges nearby occurrences into one passage', () => {
    expect(getSearchSnippets('alpha and alpha again', ['alpha'], 12)).toHaveLength(1);
  });
});
