import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  listContentAssetEntries,
  resolveContentImagePublicUrl
} from '../src/lib/content-local-images.mjs';

describe('content local images', () => {
  let tempRoot = '';

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), 'astro-whono-content-assets-'));
    process.env.ASTRO_WHONO_INTERNAL_TEST_PROJECT_ROOT = tempRoot;
    await mkdir(path.join(tempRoot, 'src', 'content', 'essay', 'demo-assets'), { recursive: true });
    await mkdir(path.join(tempRoot, 'src', 'content', 'memo', 'assets'), { recursive: true });
    await writeFile(path.join(tempRoot, 'src', 'content', 'essay', 'demo.md'), 'body');
    await writeFile(path.join(tempRoot, 'src', 'content', 'essay', 'demo-assets', 'cover.webp'), 'image');
    await writeFile(path.join(tempRoot, 'src', 'content', 'memo', 'assets', 'inline.png'), 'image');
  });

  afterEach(async () => {
    delete process.env.ASTRO_WHONO_INTERNAL_TEST_PROJECT_ROOT;
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('rewrites relative content images to stable public content-assets urls', () => {
    const result = resolveContentImagePublicUrl({
      sourceFilePath: path.join(tempRoot, 'src', 'content', 'essay', 'demo.md'),
      value: './demo-assets/cover.webp',
      base: '/blog/',
      requireExists: true
    });

    expect(result).toBe('/blog/content-assets/essay/demo-assets/cover.webp');
  });

  it('rewrites relative content images to vite fs urls in dev mode', () => {
    const result = resolveContentImagePublicUrl({
      sourceFilePath: path.join(tempRoot, 'src', 'content', 'essay', 'demo.md'),
      value: './demo-assets/cover.webp',
      base: '/blog/',
      requireExists: true,
      devFs: true
    });

    expect(result).toContain('/blog/@fs/');
    expect(result).toContain('/src/content/essay/demo-assets/cover.webp');
  });

  it('ignores remote and root-absolute image references', () => {
    const sourceFilePath = path.join(tempRoot, 'src', 'content', 'essay', 'demo.md');

    expect(resolveContentImagePublicUrl({
      sourceFilePath,
      value: 'https://example.com/cover.webp',
      requireExists: true
    })).toBeNull();

    expect(resolveContentImagePublicUrl({
      sourceFilePath,
      value: '/images/archive/cover.webp',
      requireExists: true
    })).toBeNull();
  });

  it('lists content asset files for static content-assets routes', () => {
    expect(listContentAssetEntries()).toEqual([
      expect.objectContaining({
        relativePath: 'essay/demo-assets/cover.webp',
        publicPath: '/content-assets/essay/demo-assets/cover.webp'
      }),
      expect.objectContaining({
        relativePath: 'memo/assets/inline.png',
        publicPath: '/content-assets/memo/assets/inline.png'
      })
    ]);
  });
});
