<script lang="ts">
import { tick } from 'svelte';
import type { AdminEssayEditorValues } from '../../../lib/admin-console/content-shared';
import {
  getPayloadErrors,
  getPayloadEssayPayload,
  getPayloadIssues,
  getPayloadResult,
  getPayloadRevision,
  isRecord,
  parseResponseBody,
  type AdminContentIssue,
  type AdminContentWriteResult
} from '../../../scripts/admin-content/entry-transport';
import { createWithBase } from '../../../utils/format';
import { flattenEntryIdToSlug } from '../../../utils/slug-rules';
import ArticleInfoDialog from './ArticleInfoDialog.svelte';

type StatusState = 'idle' | 'loading' | 'ready' | 'ok' | 'warn' | 'error';

type Props = {
  base?: string;
  endpoint: string;
};

let { base = '/', endpoint }: Props = $props();

let dialog = $state<ArticleInfoDialog | null>(null);
let open = $state(false);
let busy = $state(false);
let loadingEntry = $state(false);
let loadRequestId = 0;
let selectedEntryId = $state('');
let selectedTrigger = $state<HTMLElement | null>(null);
let revision = $state('');
let baselineFrontmatter = $state<AdminEssayEditorValues | null>(null);
let frontmatter = $state<AdminEssayEditorValues | null>(null);
let issues = $state<AdminContentIssue[]>([]);
let errors = $state<string[]>([]);
let statusState = $state<StatusState>('idle');
let statusText = $state('等待选择条目');

const cloneFrontmatter = (value: AdminEssayEditorValues): AdminEssayEditorValues => ({
  title: value.title,
  description: value.description,
  date: value.date,
  tagsText: value.tagsText,
  draft: value.draft,
  archive: value.archive,
  slug: value.slug,
  cover: value.cover,
  badge: value.badge
});

const createEmptyFrontmatter = (): AdminEssayEditorValues => ({
  title: '',
  description: '',
  date: '',
  tagsText: '',
  draft: false,
  archive: true,
  slug: '',
  cover: '',
  badge: ''
});

const isEqualFrontmatter = (left: AdminEssayEditorValues | null, right: AdminEssayEditorValues | null): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const dirty = $derived(!isEqualFrontmatter(frontmatter, baselineFrontmatter));
const canSave = $derived(Boolean(frontmatter) && dirty && !busy);
const slugPlaceholder = $derived(selectedEntryId ? flattenEntryIdToSlug(selectedEntryId) : '');
const withBase = $derived(createWithBase(base));

const setStatus = (state: StatusState, text: string) => {
  statusState = state;
  statusText = text;
};

const buildEntryEndpoint = (entryId: string): string => {
  const url = new URL(endpoint, window.location.href);
  url.searchParams.set('collection', 'essay');
  url.searchParams.set('entryId', entryId);
  return url.toString();
};

const closeDialog = () => {
  if (loadingEntry) {
    loadRequestId += 1;
    loadingEntry = false;
    busy = false;
    setStatus('idle', '等待选择条目');
  }
  open = false;
  selectedTrigger = null;
};

const restoreFocusAndCloseDialog = () => {
  const trigger = selectedTrigger;
  open = false;
  dialog?.restoreFocus();
  selectedTrigger = null;

  if (!dialog && trigger && document.contains(trigger)) {
    window.setTimeout(() => {
      trigger.focus({ preventScroll: true });
    }, 0);
  }
};

const resetToBaseline = () => {
  if (!baselineFrontmatter) return;
  frontmatter = cloneFrontmatter(baselineFrontmatter);
  issues = [];
  errors = [];
  setStatus('ready', '已还原到当前加载版本');
};

const closeActionMenus = (except?: HTMLDetailsElement | null) => {
  document.querySelectorAll<HTMLDetailsElement>('.admin-content-item__more[open]').forEach((details) => {
    if (details !== except) details.open = false;
  });
};

const closeActionMenu = (trigger: HTMLElement) => {
  const details = trigger.closest<HTMLDetailsElement>('.admin-content-item__more');
  if (details) details.open = false;
};

const getEssayPublicHref = (value: AdminEssayEditorValues): string | null => {
  if (value.draft === true) return null;
  const slug = value.slug.trim() || flattenEntryIdToSlug(selectedEntryId);
  return withBase(`/archive/${slug}/`);
};

const syncSelectedRow = (result: AdminContentWriteResult) => {
  if (!result.changed || !selectedTrigger || !frontmatter) return;

  const row = selectedTrigger.closest<HTMLElement>('[data-admin-content-item]');
  const titleEl = row?.querySelector<HTMLElement>('[data-admin-content-row-title]');
  const dateEl = row?.querySelector<HTMLElement>('[data-admin-content-row-date]');
  const draftEl = row?.querySelector<HTMLElement>('[data-admin-content-row-draft]');
  const archiveEl = row?.querySelector<HTMLElement>('[data-admin-content-row-archive]');
  const publicLinkEl = row?.querySelector<HTMLAnchorElement>('[data-admin-content-row-public-link]');
  const publicDisabledEl = row?.querySelector<HTMLElement>('[data-admin-content-row-public-disabled]');
  const publicHref = getEssayPublicHref(frontmatter);

  if (titleEl) titleEl.textContent = frontmatter.title || selectedEntryId;
  if (dateEl) dateEl.textContent = frontmatter.date || '未设置日期';
  if (draftEl) draftEl.hidden = frontmatter.draft !== true;
  if (archiveEl) archiveEl.hidden = frontmatter.archive !== false;
  if (publicLinkEl) {
    publicLinkEl.hidden = !publicHref;
    publicLinkEl.href = publicHref ?? '#';
    publicLinkEl.tabIndex = publicHref ? 0 : -1;
    publicLinkEl.setAttribute('aria-hidden', publicHref ? 'false' : 'true');
  }
  if (publicDisabledEl) {
    publicDisabledEl.hidden = Boolean(publicHref);
    publicDisabledEl.title = frontmatter.draft === true ? 'draft 条目默认不暴露公开页' : '当前条目未生成公开页链接';
  }
};

const openEditor = async (entryId: string, trigger: HTMLElement) => {
  const requestId = loadRequestId + 1;
  loadRequestId = requestId;
  busy = true;
  loadingEntry = true;
  open = false;
  selectedEntryId = entryId;
  selectedTrigger = trigger;
  revision = '';
  baselineFrontmatter = null;
  frontmatter = createEmptyFrontmatter();
  issues = [];
  errors = [];
  setStatus('loading', '正在加载文章信息');

  await tick();
  if (requestId !== loadRequestId) return;
  dialog?.captureReturnFocus(trigger);
  open = true;

  try {
    const response = await fetch(buildEntryEndpoint(entryId), {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    const payload = await parseResponseBody(response);
    const essayPayload = getPayloadEssayPayload(payload);
    if (requestId !== loadRequestId) return;

    if (!response.ok || !isRecord(payload) || payload.ok !== true || !essayPayload) {
      errors = getPayloadErrors(payload).length > 0
        ? getPayloadErrors(payload)
        : ['文章信息加载失败，请进入编辑页处理'];
      issues = getPayloadIssues(payload);
      loadingEntry = false;
      open = false;
      frontmatter = null;
      setStatus('error', '文章信息加载失败');
      return;
    }

    revision = essayPayload.revision;
    baselineFrontmatter = cloneFrontmatter(essayPayload.values);
    frontmatter = cloneFrontmatter(essayPayload.values);
    loadingEntry = false;
    await tick();
    if (requestId !== loadRequestId) return;
    setStatus('ready', '文章信息已加载');
  } catch {
    if (requestId !== loadRequestId) return;
    errors = ['文章信息请求失败，请稍后重试'];
    loadingEntry = false;
    open = false;
    frontmatter = null;
    setStatus('error', '文章信息请求失败');
  } finally {
    if (requestId === loadRequestId) {
      loadingEntry = false;
      busy = false;
    }
  }
};

const saveEditor = async () => {
  if (!frontmatter || !selectedEntryId || busy) return;

  busy = true;
  issues = [];
  errors = [];
  setStatus('loading', '正在保存文章信息');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8'
      },
      cache: 'no-store',
      body: JSON.stringify({
        collection: 'essay',
        entryId: selectedEntryId,
        revision,
        frontmatter
      })
    });

    const payload = await parseResponseBody(response);
    const nextRevision = getPayloadRevision(payload);
    if (nextRevision && response.ok) revision = nextRevision;

    if (!response.ok || !isRecord(payload) || payload.ok !== true) {
      issues = getPayloadIssues(payload);
      errors = getPayloadErrors(payload).length > 0
        ? getPayloadErrors(payload)
        : ['文章信息保存失败，请检查当前表单与磁盘状态'];
      setStatus(response.status === 409 ? 'warn' : 'error', response.status === 409 ? '检测到外部更新' : '文章信息保存失败');
      return;
    }

    const result = getPayloadResult(payload);
    const latestPayload = getPayloadEssayPayload(payload);
    if (!result || !latestPayload) {
      errors = ['保存响应缺少必要结果，请检查开发日志'];
      setStatus('error', '保存响应缺少结果');
      return;
    }

    baselineFrontmatter = cloneFrontmatter(latestPayload.values);
    frontmatter = cloneFrontmatter(latestPayload.values);
    revision = latestPayload.revision;
    syncSelectedRow(result);
    setStatus(result.changed ? 'ok' : 'ready', result.changed ? '文章信息已保存' : '当前文章信息没有变化');
    if (result.changed) {
      restoreFocusAndCloseDialog();
    }
  } catch {
    errors = ['文章信息保存请求失败，请稍后重试'];
    setStatus('error', '保存请求失败');
  } finally {
    busy = false;
  }
};

const handleClick = (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return;
  const currentMenu = event.target.closest<HTMLDetailsElement>('.admin-content-item__more');
  const summary = event.target.closest<HTMLElement>('.admin-content-item__more > summary');
  if (summary) {
    closeActionMenus(currentMenu);
    return;
  }
  if (!currentMenu) closeActionMenus();

  const trigger = event.target.closest<HTMLElement>('[data-admin-content-info-action]');
  if (!trigger) return;

  const entryId = trigger.dataset.entryId?.trim() ?? '';
  if (!entryId) return;

  event.preventDefault();
  closeActionMenu(trigger);
  void openEditor(entryId, trigger);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || open) return;
  const openMenu = document.querySelector<HTMLDetailsElement>('.admin-content-item__more[open]');
  if (!openMenu) return;

  event.preventDefault();
  openMenu.open = false;
  openMenu.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
};

$effect(() => {
  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleKeydown);
  return () => {
    document.removeEventListener('click', handleClick);
    document.removeEventListener('keydown', handleKeydown);
  };
});
</script>

{#if frontmatter}
  <ArticleInfoDialog
    bind:this={dialog}
    bind:value={frontmatter}
    {open}
    {issues}
    disabled={busy}
    loading={loadingEntry}
    {dirty}
    {canSave}
    {slugPlaceholder}
    onClose={closeDialog}
    onReset={resetToBaseline}
    onSave={() => void saveEditor()}
  />
{/if}

<div class="admin-content-list-action-status" data-state={statusState} role="status" aria-live="polite" aria-atomic="true">
  {statusText}
</div>

{#if errors.length > 0}
  <div class="admin-content-list-action-errors" role="alert">
    {#each errors as error}
      <p>{error}</p>
    {/each}
  </div>
{/if}
