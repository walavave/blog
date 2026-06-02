<script lang="ts">
import { onMount, tick } from 'svelte';
import type {
  AdminContentEditorPayload,
  AdminEssayEditorValues
} from '../../../lib/admin-console/content-shared';
import {
  cloneFrontmatter,
  isEqualFrontmatter
} from '../../../lib/admin-console/essay-editor-values';
import {
  isAdminContentDeletableCollectionKey,
  type AdminContentDeletableCollectionKey
} from '../../../lib/admin-console/content-delete-contract';
import {
  getPayloadDeleteResult,
  getPayloadEditorPayload,
  getPayloadErrors,
  getPayloadEssayPayload,
  getPayloadIssues,
  getPayloadResult,
  getPayloadRevision,
  isPayloadOk,
  parseResponseBody,
  type AdminContentIssue,
  type AdminContentWriteResult
} from '../../../scripts/admin-content/entry-transport';
import {
  closeClosestAdminDetailsMenu,
  initAdminDetailsMenus
} from '../../../scripts/admin-content/details-menu';
import { createWithBase } from '../../../utils/format';
import { flattenEntryIdToSlug } from '../../../utils/slug-rules';
import ArticleInfoDialog from './ArticleInfoDialog.svelte';
import {
  CONTENT_LIST_DELETE_FEEDBACK_STORAGE_KEY,
  CONTENT_LIST_DELETE_FEEDBACK_VALUE
} from './content-list-feedback';

type StatusState = 'idle' | 'loading' | 'ready' | 'ok' | 'warn' | 'error';

type Props = {
  base?: string;
  endpoint: string;
  deleteEndpoint: string;
};

const STATUS_FEEDBACK_VISIBLE_MS = 2_000;

let { base = '/', endpoint, deleteEndpoint }: Props = $props();

let dialog = $state<ArticleInfoDialog | null>(null);
let open = $state(false);
let busy = $state(false);
let loadingEntry = $state(false);
let loadRequestId = 0;
let selectedEntryId = $state('');
let selectedDefaultPublicSlug = $state('');
let selectedTrigger = $state<HTMLElement | null>(null);
let revision = $state('');
let baselineFrontmatter = $state<AdminEssayEditorValues | null>(null);
let frontmatter = $state<AdminEssayEditorValues | null>(null);
let issues = $state<AdminContentIssue[]>([]);
let errors = $state<string[]>([]);
let statusState = $state<StatusState>('idle');
let statusText = $state('');
let statusFeedbackClearTimer: number | null = null;

const createEmptyFrontmatter = (): AdminEssayEditorValues => ({
  title: '',
  description: '',
  date: '',
  publishedAt: '',
  tagsText: '',
  draft: false,
  archive: true,
  slug: '',
  cover: '',
  badge: ''
});

const dirty = $derived(!isEqualFrontmatter(frontmatter, baselineFrontmatter));
const canSave = $derived(Boolean(frontmatter) && dirty && !busy);
const slugPlaceholder = $derived(selectedDefaultPublicSlug || (selectedEntryId ? flattenEntryIdToSlug(selectedEntryId) : ''));
const withBase = $derived(createWithBase(base));

const setStatus = (state: StatusState, text: string) => {
  statusState = state;
  statusText = text;
};

const clearStatusFeedbackTimer = () => {
  if (statusFeedbackClearTimer === null) return;
  window.clearTimeout(statusFeedbackClearTimer);
  statusFeedbackClearTimer = null;
};

const queueStatusFeedbackClear = (state: StatusState, text: string) => {
  clearStatusFeedbackTimer();
  statusFeedbackClearTimer = window.setTimeout(() => {
    statusFeedbackClearTimer = null;
    if (statusState === state && statusText === text) {
      setStatus('idle', '');
    }
  }, STATUS_FEEDBACK_VISIBLE_MS);
};

const takeStoredDeleteFeedback = (): boolean => {
  try {
    const value = window.sessionStorage.getItem(CONTENT_LIST_DELETE_FEEDBACK_STORAGE_KEY);
    window.sessionStorage.removeItem(CONTENT_LIST_DELETE_FEEDBACK_STORAGE_KEY);
    return value === CONTENT_LIST_DELETE_FEEDBACK_VALUE;
  } catch {
    return false;
  }
};

const buildEntryEndpoint = (collection: AdminContentDeletableCollectionKey, entryId: string): string => {
  const url = new URL(endpoint, window.location.href);
  url.searchParams.set('collection', collection);
  url.searchParams.set('entryId', entryId);
  return url.toString();
};

const closeDialog = () => {
  if (loadingEntry) {
    loadRequestId += 1;
    loadingEntry = false;
    busy = false;
    setStatus('idle', '');
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
  setStatus('ready', '已还原');
};

const closeActionMenu = (trigger: HTMLElement) => {
  closeClosestAdminDetailsMenu(trigger, '.admin-content-item__more');
};

const getRowTitle = (trigger: HTMLElement, entryId: string): string => {
  const row = trigger.closest<HTMLElement>('[data-admin-content-item]');
  return row?.querySelector<HTMLElement>('[data-admin-content-row-title]')?.textContent?.trim() || entryId;
};

const getRowCollectionLabel = (trigger: HTMLElement): string =>
  trigger
    .closest<HTMLElement>('.admin-content-module')
    ?.querySelector<HTMLElement>('.admin-content-module__head h3 span')
    ?.textContent
    ?.trim()
  || '该分类';

const removeDeletedRowFromList = (trigger: HTMLElement): void => {
  const row = trigger.closest<HTMLElement>('[data-admin-content-item]');
  const list = row?.parentElement;
  if (!row || !list) return;

  const collectionLabel = getRowCollectionLabel(trigger);
  row.remove();

  if (list.children.length > 0) return;

  const empty = document.createElement('p');
  empty.className = 'admin-content-empty';
  empty.textContent = `${collectionLabel}中没有符合当前筛选条件的内容。`;
  list.replaceWith(empty);
};

const getDeletePayload = (
  payload: unknown,
  collection: AdminContentDeletableCollectionKey,
  entryId: string
): AdminContentEditorPayload | null => {
  const entryPayload = getPayloadEditorPayload(payload);
  if (!entryPayload || entryPayload.collection !== collection || entryPayload.entryId !== entryId) return null;
  if (typeof entryPayload.revision !== 'string' || typeof entryPayload.relativePath !== 'string') return null;
  return entryPayload;
};

const getEssayPublicHref = (value: AdminEssayEditorValues): string | null => {
  if (value.draft === true) return null;
  const slug = value.slug.trim() || selectedDefaultPublicSlug || flattenEntryIdToSlug(selectedEntryId);
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
  const publicHref = getEssayPublicHref(frontmatter);

  if (titleEl) titleEl.textContent = frontmatter.title || selectedEntryId;
  if (dateEl) dateEl.textContent = frontmatter.date || '未设置日期';
  if (draftEl) draftEl.hidden = frontmatter.draft !== true;
  if (archiveEl) archiveEl.hidden = frontmatter.archive !== false;
  if (publicLinkEl) {
    if (publicHref) {
      publicLinkEl.href = publicHref;
      publicLinkEl.classList.remove('is-disabled');
      publicLinkEl.removeAttribute('aria-disabled');
      publicLinkEl.removeAttribute('title');
    } else {
      publicLinkEl.removeAttribute('href');
      publicLinkEl.classList.add('is-disabled');
      publicLinkEl.setAttribute('aria-disabled', 'true');
      publicLinkEl.title = frontmatter.draft === true ? 'draft 条目默认不暴露公开页' : '当前条目未生成公开页链接';
    }
    publicLinkEl.tabIndex = publicHref ? 0 : -1;
  }
};

const openEditor = async (entryId: string, trigger: HTMLElement) => {
  const requestId = loadRequestId + 1;
  loadRequestId = requestId;
  busy = true;
  loadingEntry = true;
  open = false;
  selectedEntryId = entryId;
  selectedDefaultPublicSlug = '';
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
    const response = await fetch(buildEntryEndpoint('essay', entryId), {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    const payload = await parseResponseBody(response);
    const essayPayload = getPayloadEssayPayload(payload);
    if (requestId !== loadRequestId) return;

    if (!response.ok || !isPayloadOk(payload) || !essayPayload) {
      const payloadErrors = getPayloadErrors(payload);
      errors = payloadErrors;
      issues = getPayloadIssues(payload);
      loadingEntry = false;
      open = false;
      frontmatter = null;
      setStatus('error', payloadErrors.length > 0 ? '文章信息加载失败' : '加载失败，可进入编辑页处理');
      return;
    }

    revision = essayPayload.revision;
    selectedDefaultPublicSlug = essayPayload.defaultPublicSlug;
    baselineFrontmatter = cloneFrontmatter(essayPayload.values);
    frontmatter = cloneFrontmatter(essayPayload.values);
    loadingEntry = false;
    await tick();
    if (requestId !== loadRequestId) return;
    setStatus('ready', '文章信息已加载');
  } catch {
    if (requestId !== loadRequestId) return;
    errors = [];
    loadingEntry = false;
    open = false;
    frontmatter = null;
    setStatus('error', '加载失败，请稍后重试');
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

    if (!response.ok || !isPayloadOk(payload)) {
      issues = getPayloadIssues(payload);
      const payloadErrors = getPayloadErrors(payload);
      errors = payloadErrors;
      const state = response.status === 409 ? 'warn' : 'error';
      const fallbackText = response.status === 409 ? '检测到外部更新' : '保存失败，请检查当前表单与磁盘状态';
      setStatus(state, payloadErrors.length > 0 ? (response.status === 409 ? '检测到外部更新' : '文章信息保存失败') : fallbackText);
      return;
    }

    const result = getPayloadResult(payload);
    const latestPayload = getPayloadEssayPayload(payload);
    if (!result || !latestPayload) {
      errors = [];
      setStatus('error', '保存响应异常，请检查开发日志');
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
    errors = [];
    setStatus('error', '保存请求失败，请稍后重试');
  } finally {
    busy = false;
  }
};

const deleteEntry = async (trigger: HTMLElement) => {
  if (busy) {
    errors = [];
    setStatus('warn', '操作进行中');
    return;
  }

  const rawCollection = trigger.dataset.collection?.trim() ?? '';
  const entryId = trigger.dataset.entryId?.trim() ?? '';
  const expectedRelativePath = trigger.dataset.relativePath?.trim() ?? '';

  if (!isAdminContentDeletableCollectionKey(rawCollection) || !entryId || !expectedRelativePath) {
    errors = [];
    setStatus('error', '删除信息不完整，请刷新后重试');
    return;
  }

  busy = true;
  errors = [];
  issues = [];
  setStatus('loading', '正在准备删除确认');

  try {
    // 列表中的 revision 可能已经过期，确认前先读取一次最新文件状态。
    const loadResponse = await fetch(buildEntryEndpoint(rawCollection, entryId), {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });
    const loadPayload = await parseResponseBody(loadResponse);
    const entryPayload = getDeletePayload(loadPayload, rawCollection, entryId);

    if (!loadResponse.ok || !isPayloadOk(loadPayload) || !entryPayload) {
      const payloadErrors = getPayloadErrors(loadPayload);
      errors = payloadErrors;
      issues = getPayloadIssues(loadPayload);
      setStatus('error', payloadErrors.length > 0 ? '删除确认失败' : '删除确认失败，请刷新后重试');
      return;
    }

    if (entryPayload.relativePath !== expectedRelativePath) {
      errors = [];
      setStatus('warn', '列表已过期，请刷新后再删除');
      return;
    }

    const title = getRowTitle(trigger, entryId);
    const confirmed = window.confirm([
      `确认删除《${title}》？`,
      '',
      `类型：${getRowCollectionLabel(trigger)}`,
      `源文件：${entryPayload.relativePath}`,
      '',
      '文件会移到 .trash/content/，之后可从回收站手动恢复。'
    ].join('\n'));

    if (!confirmed) {
      setStatus('ready', '已取消删除');
      return;
    }

    setStatus('loading', '正在移动到回收站');
    const deleteResponse = await fetch(deleteEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8'
      },
      cache: 'no-store',
      body: JSON.stringify({
        collection: rawCollection,
        entryId,
        revision: entryPayload.revision,
        expectedRelativePath: entryPayload.relativePath
      })
    });
    const deletePayload = await parseResponseBody(deleteResponse);

    if (!deleteResponse.ok || !isPayloadOk(deletePayload)) {
      const payloadErrors = getPayloadErrors(deletePayload);
      errors = payloadErrors;
      issues = getPayloadIssues(deletePayload);
      const state = deleteResponse.status === 409 ? 'warn' : 'error';
      const fallbackText = deleteResponse.status === 409 ? '检测到外部更新' : '删除失败，请检查控制台日志';
      setStatus(state, payloadErrors.length > 0 ? (deleteResponse.status === 409 ? '检测到外部更新' : '删除失败') : fallbackText);
      return;
    }

    const result = getPayloadDeleteResult(deletePayload);
    if (!result || !result.deleted || !result.trashedPath) {
      errors = [];
      setStatus('error', '删除响应异常，请检查开发日志');
      return;
    }

    removeDeletedRowFromList(trigger);
    setStatus('ok', '已移到回收站，刷新页面可同步分页与计数');
  } catch {
    errors = [];
    setStatus('error', '删除请求失败，请稍后重试');
  } finally {
    busy = false;
  }
};

const handleClick = (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return;

  const deleteTrigger = event.target.closest<HTMLElement>('[data-admin-content-delete-action]');
  if (deleteTrigger) {
    event.preventDefault();
    closeActionMenu(deleteTrigger);
    void deleteEntry(deleteTrigger);
    return;
  }

  const trigger = event.target.closest<HTMLElement>('[data-admin-content-info-action]');
  if (!trigger) return;

  const entryId = trigger.dataset.entryId?.trim() ?? '';
  if (!entryId) return;

  event.preventDefault();
  closeActionMenu(trigger);
  void openEditor(entryId, trigger);
};

onMount(() => {
  if (takeStoredDeleteFeedback()) {
    const statusState: StatusState = 'ok';
    const statusText = '已移到回收站';
    setStatus(statusState, statusText);
    queueStatusFeedbackClear(statusState, statusText);
  }

  return clearStatusFeedbackTimer;
});

$effect(() => {
  document.querySelectorAll<HTMLButtonElement>('[data-admin-content-delete-action]').forEach((button) => {
    button.disabled = busy;
  });
});

$effect(() => {
  const cleanupDetailsMenus = initAdminDetailsMenus({
    selector: '.admin-content-item__more'
  });
  document.addEventListener('click', handleClick);
  return () => {
    cleanupDetailsMenus();
    document.removeEventListener('click', handleClick);
  };
});
</script>

{#if frontmatter}
  <ArticleInfoDialog
    bind:this={dialog}
    bind:value={frontmatter}
    collection="essay"
    {open}
    {issues}
    disabled={busy}
    loading={loadingEntry}
    {dirty}
    {canSave}
    {slugPlaceholder}
    dialogTitle="文章信息"
    fieldsAriaLabel="随笔字段"
    onClose={closeDialog}
    onReset={resetToBaseline}
    onSave={() => void saveEditor()}
  />
{/if}

<div class="admin-content-action-feedback">
  <p class="admin-status admin-content-action-status" data-state={statusState} role="status" aria-live="polite" aria-atomic="true">
    {statusText}
  </p>

  {#if errors.length > 0}
    <div class="admin-content-action-errors" role="alert">
      {#each errors as error}
        <p>{error}</p>
      {/each}
    </div>
  {/if}
</div>
