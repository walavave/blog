import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CONTENT_IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpg', '.jpeg', '.png', '.svg', '.webp']);
const CONTENT_ROOT_SEGMENTS = ['src', 'content'];

const hasUrlScheme = (value) => /^[a-z][a-z\d+.-]*:/i.test(value);

const withBase = (base, targetPath) => {
  const normalizedBase = String(base ?? '/').trim().replace(/\/+$/, '');
  const normalizedTarget = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  if (!normalizedBase || normalizedBase === '/') {
    return normalizedTarget;
  }
  return `${normalizedBase}${normalizedTarget}`;
};

const getProjectRoot = () => process.env.ASTRO_WHONO_INTERNAL_TEST_PROJECT_ROOT?.trim() || process.cwd();

export const getContentRoot = () => path.join(getProjectRoot(), ...CONTENT_ROOT_SEGMENTS);

const normalizeRelativeImageReference = (value) => {
  const trimmed = String(value ?? '').trim();
  if (
    !trimmed
    || trimmed.startsWith('/')
    || trimmed.startsWith('//')
    || trimmed.startsWith('#')
    || hasUrlScheme(trimmed)
  ) {
    return null;
  }

  const match = trimmed.match(/^([^?#]+)([?#].*)?$/);
  const rawPath = match?.[1]?.trim() ?? '';
  const suffix = match?.[2] ?? '';
  if (!rawPath) return null;

  let decodedPath = rawPath;
  try {
    decodedPath = decodeURI(rawPath);
  } catch {}

  return {
    decodedPath,
    suffix
  };
};

const toContentAssetPublicPath = (filePath, base = '/') => {
  const relativePath = path.relative(getContentRoot(), filePath).replace(/\\/g, '/');
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return withBase(base, `/content-assets/${relativePath}`);
};

const toViteFsPublicPath = (filePath, base = '/') => {
  const viteFsPath = `/@fs${pathToFileURL(filePath).pathname}`;
  return withBase(base, viteFsPath);
};

export const resolveContentImagePublicUrl = ({
  sourceFilePath,
  value,
  base = '/',
  requireExists = false,
  devFs = false
}) => {
  if (!sourceFilePath) return null;

  const normalized = normalizeRelativeImageReference(value);
  if (!normalized) return null;

  const resolvedFilePath = path.resolve(path.dirname(sourceFilePath), normalized.decodedPath);
  const extension = path.extname(resolvedFilePath).toLowerCase();
  if (!CONTENT_IMAGE_EXTENSIONS.has(extension)) return null;
  if (requireExists && !existsSync(resolvedFilePath)) return null;

  const publicPath = devFs
    ? toViteFsPublicPath(resolvedFilePath, base)
    : toContentAssetPublicPath(resolvedFilePath, base);
  if (!publicPath) return null;

  return `${publicPath}${normalized.suffix}`;
};

export const rewriteRenderedContentImageUrls = ({
  html,
  sourceFilePath,
  base = '/',
  requireExists = false,
  devFs = false
}) => {
  if (!sourceFilePath || typeof html !== 'string' || html.length === 0) {
    return html;
  }

  return html.replace(/(<img\b[^>]*\bsrc=(['"]))(.*?)(\2)/gi, (fullMatch, prefix, _quote, srcValue, suffix) => {
    const rewrittenSrc = resolveContentImagePublicUrl({
      sourceFilePath,
      value: srcValue,
      base,
      requireExists,
      devFs
    });
    return rewrittenSrc ? `${prefix}${rewrittenSrc}${suffix}` : fullMatch;
  });
};

export const listContentAssetEntries = (directoryPath = getContentRoot(), rootPath = getContentRoot()) => {
  const entries = [];
  const stack = [directoryPath];

  while (stack.length > 0) {
    const currentPath = stack.pop();
    if (!currentPath) continue;

    const children = readdirSync(currentPath, { withFileTypes: true });
    for (const child of children) {
      const childPath = path.join(currentPath, child.name);
      if (child.isDirectory()) {
        stack.push(childPath);
        continue;
      }
      if (!child.isFile()) continue;
      if (!CONTENT_IMAGE_EXTENSIONS.has(path.extname(child.name).toLowerCase())) continue;

      const relativePath = path.relative(rootPath, childPath).replace(/\\/g, '/');
      if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) continue;

      entries.push({
        absolutePath: childPath,
        relativePath,
        publicPath: `/content-assets/${relativePath}`
      });
    }
  }

  return entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
};
