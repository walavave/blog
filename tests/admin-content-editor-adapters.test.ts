import { describe, expect, it } from 'vitest';
import {
  getContentEditorAdapter
} from '../src/components/admin/editor/content-editor-adapters';
import {
  getPayloadEditorBody,
  getPayloadEditorValues
} from '../src/scripts/admin-content/entry-transport';
import type {
  AdminBitsEditorValues,
  AdminEssayEditorValues
} from '../src/lib/admin-console/content-shared';

describe('content editor adapters', () => {
  it('keeps essay editor body capabilities and clones values', () => {
    const adapter = getContentEditorAdapter('essay');
    const values: AdminEssayEditorValues = {
      title: 'Essay',
      description: 'Desc',
      date: '2026-05-26',
      publishedAt: '',
      tagsText: 'dev',
      draft: false,
      archive: true,
      slug: '',
      cover: '',
      badge: ''
    };

    const cloned = adapter.cloneValues(values);
    expect(cloned).toEqual(values);
    expect(cloned).not.toBe(values);
    expect(adapter.capabilities.body).toBe(true);
    expect(adapter.capabilities.imageInsert).toBe(true);
    expect(adapter.getWriteFieldLabel('publishedAt')).toBe('发布时间');
  });

  it('defines bits as a frontmatter-only editor capability', () => {
    const adapter = getContentEditorAdapter('bits');
    const values: AdminBitsEditorValues = {
      title: '',
      description: '',
      date: '2026-05-26T10:00:00+08:00',
      tagsText: 'note',
      draft: false,
      authorName: '',
      authorAvatar: '',
      imagesText: '[]'
    };

    const cloned = adapter.cloneValues(values);
    expect(cloned).toEqual(values);
    expect(cloned).not.toBe(values);
    expect(adapter.capabilities.body).toBe(false);
    expect(adapter.capabilities.imageInsert).toBe(false);
    expect(adapter.frontmatterIssuePaths.has('imagesText')).toBe(true);
    expect(adapter.isFrontmatterIssuePath('images[0].src')).toBe(true);
    expect(adapter.getWriteFieldLabel('authorAvatar')).toBe('作者头像');
  });

  it('reads collection-specific editor payload values', () => {
    const bitsValues: AdminBitsEditorValues = {
      title: 'Bit',
      description: '',
      date: '2026-05-26T10:00:00+08:00',
      tagsText: '',
      draft: false,
      authorName: '',
      authorAvatar: '',
      imagesText: ''
    };
    const payload = {
      ok: true,
      payload: {
        collection: 'bits',
        entryId: '2026-05-26-bit',
        publicEntryId: '2026-05-26-bit',
        defaultPublicSlug: '2026-05-26-bit',
        revision: 'rev',
        relativePath: 'src/content/bits/2026-05-26-bit.md',
        writable: true,
        readonlyReason: null,
        values: bitsValues
      }
    };

    expect(getPayloadEditorValues(payload, 'bits')).toEqual(bitsValues);
    expect(getPayloadEditorValues(payload, 'essay')).toBeNull();
    expect(getPayloadEditorBody(payload, 'bits')).toBeNull();
  });
});
