import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import { createPublicMarkdownConfig } from './src/plugins/markdown-pipeline.mjs';
import { site, hasSiteUrl } from './site.config.mjs';

const isProductionBuild = process.env.NODE_ENV === 'production';
const SITEMAP_ROUTE_ROOTS = new Set(['about', 'admin', 'archive', 'bits', 'checks', 'essay', 'memo']);
const rawDeploymentBase = process.env.ASTRO_WHONO_BASE_PATH ?? '/';
const trimmedDeploymentBase = String(rawDeploymentBase).trim();

// Git Bash 的 MSYS 路径转换会把 "/blog" 这类值改写成 "C:/Program Files/Git/blog"，
// 导致深处的 "Missing parameter" 预渲染错误；在配置期直接报可读错误。
// 规避：命令前加 MSYS_NO_PATHCONV=1（或 MSYS2_ENV_CONV_EXCL=ASTRO_WHONO_BASE_PATH）。
if (/[:\s]/.test(trimmedDeploymentBase)) {
  throw new Error(
    `Invalid ASTRO_WHONO_BASE_PATH "${rawDeploymentBase}": looks like a filesystem path, not a URL base. ` +
      'If running under Git Bash, prefix the command with MSYS_NO_PATHCONV=1 to stop MSYS path conversion.',
  );
}

const normalizeDeploymentBase = (value) => {
  const segment = String(value ?? '').trim().replace(/^\/+|\/+$/g, '');
  return segment ? `/${segment}/` : '/';
};

const deploymentBase = normalizeDeploymentBase(rawDeploymentBase);

const normalizeSitemapPathname = (page) => {
  let pathname = '/';

  try {
    pathname = new URL(page).pathname;
  } catch {
    [pathname = '/'] = page.split(/[?#]/, 1);
  }

  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
  const segments = normalizedPathname.split('/').filter(Boolean);
  const routeRootIndex = segments.findIndex((segment) => SITEMAP_ROUTE_ROOTS.has(segment));

  if (routeRootIndex > 0) {
    return `/${segments.slice(routeRootIndex).join('/')}`;
  }

  return normalizedPathname;
};

const isExcludedSitemapPathname = (pathname) =>
  pathname === '/admin'
  || pathname.startsWith('/admin/')
  || pathname === '/checks'
  || pathname.startsWith('/checks/')
  || pathname === '/bits/draft-dialog'
  || /^\/essay\/[^/]+$/.test(pathname);

const isExcludedSitemapEntry = (page) => isExcludedSitemapPathname(normalizeSitemapPathname(page));
const integrations = [
  ...(!isProductionBuild ? [svelte()] : []),
  ...(hasSiteUrl ? [sitemap({ filter: (page) => !isExcludedSitemapEntry(page) })] : [])
];

export default defineConfig({
  // Required for RSS generation. Prefer SITE_URL; fallback keeps build passing.
  site: site.url,
  base: deploymentBase,
  // DEV 使用 server output 允许 Theme Console 的 /api/admin/settings/ 处理读写；
  // 构建阶段回到 static，让 /admin/ 保持只读提示，并避免把该路径当作生产公开 API。
  output: isProductionBuild ? 'static' : 'server',
  integrations,
  trailingSlash: 'always',
  build: {
    inlineStylesheets: 'auto'
  },
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    optimizeDeps: {
      include: [
        'emoji-picker-element',
        '@lucide/svelte/icons/*',
        '@codemirror/commands',
        '@codemirror/lang-markdown',
        '@codemirror/language',
        '@codemirror/state',
        '@codemirror/view',
        '@lezer/highlight'
      ]
    }
  },
  markdown: createPublicMarkdownConfig({ base: deploymentBase })
});
