<script lang="ts">
import X from '@lucide/svelte/icons/x';
import type { AdminEssayEditorValues } from '../../../lib/admin-console/content-shared';
import { createModalDialogFocusController } from '../../../scripts/admin-console/modal-dialog-focus';
import FrontmatterSidebar from './FrontmatterSidebar.svelte';

type AdminContentIssue = {
  path: string;
  message: string;
};

type Props = {
  open: boolean;
  value: AdminEssayEditorValues;
  issues?: readonly AdminContentIssue[];
  disabled?: boolean;
  loading?: boolean;
  dirty?: boolean;
  canSave?: boolean;
  slugPlaceholder?: string;
  onClose: () => void;
  onReset: () => void;
  onSave: () => void;
};

let {
  open,
  value = $bindable(),
  issues = [],
  disabled = false,
  loading = false,
  dirty = false,
  canSave = false,
  slugPlaceholder = '',
  onClose,
  onReset,
  onSave
}: Props = $props();

let panelEl = $state<HTMLElement | null>(null);
let closeButtonEl = $state<HTMLButtonElement | null>(null);

const closeDialog = () => {
  onClose();
  dialogFocus.restoreFocus();
};

const getInitialFocus = (): HTMLElement | null => {
  if (loading) return closeButtonEl;
  return panelEl?.querySelector<HTMLElement>('.admin-field.is-invalid .admin-field__control:not([disabled])')
    ?? panelEl?.querySelector<HTMLElement>('[name="title"]:not([disabled])')
    ?? closeButtonEl;
};

const dialogFocus = createModalDialogFocusController({
  getDialog: () => panelEl,
  getInitialFocus,
  onClose: closeDialog
});

export const captureReturnFocus = (trigger?: Element | null) => {
  dialogFocus.captureReturnFocus(trigger);
};

export const restoreFocus = () => {
  dialogFocus.restoreFocus();
};

$effect(() => {
  if (!open) return;

  dialogFocus.focusInitial();
  document.addEventListener('keydown', dialogFocus.handleKeydown);
  return () => {
    document.removeEventListener('keydown', dialogFocus.handleKeydown);
  };
});
</script>

{#if open}
  <div class="admin-modal admin-editor-frontmatter-popover" role="presentation">
    <button
      class="admin-modal__backdrop admin-editor-frontmatter-popover__backdrop"
      type="button"
      aria-label="关闭文章信息"
      onclick={closeDialog}
    ></button>
    <div
      bind:this={panelEl}
      id="admin-editor-frontmatter-panel"
      class="admin-modal__panel admin-editor-frontmatter-popover__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-editor-frontmatter-panel-title"
      tabindex="-1"
    >
      <header class="admin-modal__head admin-editor-frontmatter-popover__head">
        <div>
          <h3 id="admin-editor-frontmatter-panel-title" class="admin-modal__title admin-content-section-title">文章信息</h3>
        </div>
        <button
          bind:this={closeButtonEl}
          class="admin-btn admin-btn--ghost admin-btn--compact admin-btn--icon admin-editor-frontmatter-popover__close"
          type="button"
          aria-label="关闭文章信息"
          disabled={disabled}
          onclick={closeDialog}
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>
      <div class="admin-modal__body">
        {#if loading}
          <div class="admin-editor-frontmatter-popover__loading" role="status" aria-live="polite">
            正在加载文章信息
          </div>
        {:else}
          <FrontmatterSidebar bind:value {issues} {disabled} {slugPlaceholder} />
        {/if}
      </div>
      <footer class="admin-modal__actions admin-editor-frontmatter-popover__actions">
        <div class="admin-editor-frontmatter-popover__toggles">
          <label class="admin-toggle-row">
            <input name="draft" type="checkbox" bind:checked={value.draft} disabled={disabled || loading} />
            <span>草稿</span>
          </label>
          <label class="admin-toggle-row">
            <input name="archive" type="checkbox" bind:checked={value.archive} disabled={disabled || loading} />
            <span>归档</span>
          </label>
        </div>
        <div class="admin-editor-frontmatter-popover__buttons">
          <button class="admin-btn admin-btn--ghost admin-btn--compact" type="button" onclick={onReset} disabled={disabled || loading || !dirty}>
            还原
          </button>
          <button class="admin-btn admin-btn--primary admin-btn--compact" type="button" onclick={onSave} disabled={loading || !canSave}>
            保存
          </button>
        </div>
      </footer>
    </div>
  </div>
{/if}
