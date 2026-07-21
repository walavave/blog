const findMatchRanges = (text: string, terms: readonly string[]) => {
  const lower = text.toLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];
  for (const rawTerm of terms) {
    const term = rawTerm.trim().toLowerCase();
    if (!term) continue;
    let from = 0;
    while (from < lower.length) {
      const start = lower.indexOf(term, from);
      if (start < 0) break;
      ranges.push({ start, end: start + term.length });
      from = start + term.length;
    }
  }
  return ranges.sort((a, b) => a.start - b.start || b.end - a.end);
};

export const getSearchSnippets = (value: string, terms: readonly string[], contextLength = 64): string[] => {
  const text = value.trim();
  if (!text) return [];
  const windows = findMatchRanges(text, terms).map(({ start, end }) => ({
    start: Math.max(0, start - contextLength),
    end: Math.min(text.length, end + contextLength)
  }));
  if (!windows.length) return [];
  const merged = [windows[0]!];
  for (const window of windows.slice(1)) {
    const previous = merged[merged.length - 1]!;
    if (window.start <= previous.end) previous.end = Math.max(previous.end, window.end);
    else merged.push(window);
  }
  return merged.map(({ start, end }) =>
    `${start > 0 ? '...' : ''}${text.slice(start, end).trim()}${end < text.length ? '...' : ''}`
  );
};
