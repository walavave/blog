import { describe, expect, it } from 'vitest';
import { cleanMarkdownToText } from '../src/utils/excerpt';

describe('cleanMarkdownToText', () => {
  it('removes callout directive names while preserving visible content', () => {
    const markdown = [
      ':::note',
      'Callout body remains searchable.',
      ':::',
      '',
      ':::warning[注意事项]',
      'Second body remains searchable.',
      ':::'
    ].join('\n');

    const text = cleanMarkdownToText(markdown);

    expect(text).toBe('Callout body remains searchable. 注意事项 Second body remains searchable.');
    expect(text).not.toMatch(/note|warning/i);
  });

  it('does not produce an ot match from a note marker', () => {
    expect(cleanMarkdownToText(':::note\n正文\n:::').toLowerCase()).not.toContain('ot');
  });
});
