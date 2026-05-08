<script lang="ts">
import ImagePlus from '@lucide/svelte/icons/image-plus';
import Upload from '@lucide/svelte/icons/upload';
import X from '@lucide/svelte/icons/x';
import { createModalDialogFocusController } from '../../../scripts/admin-console/modal-dialog-focus';

type UploadResult = {
  src: string;
  path: string;
  fileName: string;
  width: number | null;
  height: number | null;
  size: number | null;
  mimeType: string | null;
};

type Props = {
  open: boolean;
  uploadEndpoint: string;
  entryId: string;
  disabled?: boolean;
  onClose: () => void;
  onInsert: (markdown: string, result: UploadResult) => void;
};

let {
  open,
  uploadEndpoint,
  entryId,
  disabled = false,
  onClose,
  onInsert
}: Props = $props();

let fileInputEl = $state<HTMLInputElement | null>(null);
let dialogPanelEl = $state<HTMLElement | null>(null);
let closeButtonEl = $state<HTMLButtonElement | null>(null);
let chooseButtonEl = $state<HTMLButtonElement | null>(null);
let selectedFile = $state<File | null>(null);
let previewUrl = $state('');
let altText = $state('');
let busy = $state(false);
let errorText = $state('');

const formatBytes = (value: number): string => {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
};

const escapeMarkdownAlt = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').replace(/]/g, '\\]');

const createMarkdownImage = (alt: string, src: string): string =>
  `![${escapeMarkdownAlt(alt)}](${src})`;

const resetDialog = () => {
  selectedFile = null;
  altText = '';
  errorText = '';
  busy = false;
  if (fileInputEl) fileInputEl.value = '';
};

const finishDialog = (options: { restoreFocus?: boolean } = {}) => {
  resetDialog();
  onClose();
  if (options.restoreFocus !== false) {
    imageDialogFocus.restoreFocus();
  }
};

const closeDialog = () => {
  if (busy) return;
  finishDialog();
};

const requestFileSelection = () => {
  if (disabled || busy) return;
  fileInputEl?.click();
};

const handleFileChange = () => {
  const [file] = Array.from(fileInputEl?.files ?? []);
  selectedFile = file ?? null;
  errorText = '';
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getPayloadErrors = (value: unknown): string[] =>
  isRecord(value) && Array.isArray(value.errors)
    ? value.errors.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

const getUploadResult = (value: unknown): UploadResult | null => {
  if (!isRecord(value) || !isRecord(value.result)) return null;
  const result = value.result;
  if (typeof result.src !== 'string' || typeof result.path !== 'string' || typeof result.fileName !== 'string') return null;

  return {
    src: result.src,
    path: result.path,
    fileName: result.fileName,
    width: typeof result.width === 'number' ? result.width : null,
    height: typeof result.height === 'number' ? result.height : null,
    size: typeof result.size === 'number' ? result.size : null,
    mimeType: typeof result.mimeType === 'string' ? result.mimeType : null
  };
};

const uploadAndInsert = async () => {
  if (disabled || busy) return;
  if (!selectedFile) {
    errorText = '请选择图片';
    return;
  }

  busy = true;
  errorText = '';

  try {
    const formData = new FormData();
    formData.set('collection', 'essay');
    formData.set('entryId', entryId);
    formData.set('image', selectedFile);

    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store',
      body: formData
    });

    const payload = await parseResponseBody(response);
    const result = getUploadResult(payload);
    if (!response.ok || !isRecord(payload) || payload.ok !== true || !result) {
      errorText = getPayloadErrors(payload)[0] ?? '图片上传失败';
      return;
    }

    onInsert(createMarkdownImage(altText, result.src), result);
    finishDialog({ restoreFocus: false });
  } catch {
    errorText = '图片上传请求失败';
  } finally {
    busy = false;
  }
};

const imageDialogFocus = createModalDialogFocusController({
  getDialog: () => dialogPanelEl,
  getInitialFocus: () => chooseButtonEl ?? closeButtonEl,
  onClose: () => closeDialog()
});

$effect(() => {
  if (!open) {
    resetDialog();
    return;
  }

  imageDialogFocus.captureReturnFocus();
  imageDialogFocus.focusInitial();
  document.addEventListener('keydown', imageDialogFocus.handleKeydown);
  return () => {
    document.removeEventListener('keydown', imageDialogFocus.handleKeydown);
  };
});

$effect(() => {
  const url = selectedFile ? URL.createObjectURL(selectedFile) : '';
  previewUrl = url;

  return () => {
    if (url) URL.revokeObjectURL(url);
  };
});
</script>

{#if open}
  <div class="admin-modal admin-editor-image-insert" role="presentation">
    <button
      class="admin-modal__backdrop admin-editor-image-insert__backdrop"
      type="button"
      aria-label="关闭插入图片"
      onclick={closeDialog}
    ></button>
    <div
      bind:this={dialogPanelEl}
      class="admin-modal__panel admin-editor-image-insert__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-editor-image-insert-title"
      tabindex="-1"
    >
      <form
        class="admin-editor-image-insert__form"
        onsubmit={(event) => {
          event.preventDefault();
          void uploadAndInsert();
        }}
      >
        <header class="admin-modal__head admin-editor-image-insert__head">
          <div class="admin-editor-image-insert__title-wrap">
            <span class="admin-editor-image-insert__icon" aria-hidden="true">
              <ImagePlus size={16} strokeWidth={2} />
            </span>
            <h3 id="admin-editor-image-insert-title" class="admin-modal__title admin-content-section-title">插入图片</h3>
          </div>
          <button
            bind:this={closeButtonEl}
            class="admin-btn admin-btn--ghost admin-btn--compact admin-btn--icon admin-editor-image-insert__close"
            type="button"
            aria-label="关闭插入图片"
            disabled={busy}
            onclick={closeDialog}
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <div class="admin-modal__body admin-editor-image-insert__body">
          <input
            bind:this={fileInputEl}
            class="admin-sr-only"
            type="file"
            accept="image/avif,image/gif,image/jpeg,image/png,image/svg+xml,image/webp"
            tabindex="-1"
            onchange={handleFileChange}
          />

          <button
            bind:this={chooseButtonEl}
            class="admin-editor-image-insert__dropzone"
            type="button"
            disabled={disabled || busy}
            onclick={requestFileSelection}
          >
            <span class="admin-editor-image-insert__dropzone-icon" aria-hidden="true">
              <Upload size={18} strokeWidth={2} />
            </span>
            <span class="admin-editor-image-insert__dropzone-copy">
              <strong>{selectedFile ? selectedFile.name : '选择图片'}</strong>
              <span>{selectedFile ? formatBytes(selectedFile.size) : '支持常见图片格式，上传后会插入 Markdown'}</span>
            </span>
          </button>

          {#if previewUrl}
            <div class="admin-editor-image-insert__preview">
              <img src={previewUrl} alt="" />
            </div>
          {/if}

          <label class="admin-field admin-editor-image-insert__field">
            <span class="admin-field__label">alt 文本</span>
            <input
              class="admin-field__control"
              type="text"
              bind:value={altText}
              disabled={disabled || busy}
              placeholder="可留空"
            />
          </label>

          {#if errorText}
            <p class="admin-editor-image-insert__error" role="alert">{errorText}</p>
          {/if}
        </div>

        <footer class="admin-modal__actions admin-editor-image-insert__actions">
          <button class="admin-btn admin-btn--ghost admin-btn--compact" type="button" disabled={busy} onclick={closeDialog}>取消</button>
          <button class="admin-btn admin-btn--primary admin-btn--compact" type="submit" disabled={disabled || busy}>
            {busy ? '上传中…' : '上传并插入'}
          </button>
        </footer>
      </form>
    </div>
  </div>
{/if}
