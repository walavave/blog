<script lang="ts">
import type {
  AdminContentEditorValues,
  AdminContentWriteCollectionKey
} from '../../../lib/admin-console/content-shared';
import type { AdminContentIssue } from './content-editor-client';
import ArticleInfoDialog from './ArticleInfoDialog.svelte';
import GalleryInsertDialog from './GalleryInsertDialog.svelte';
import ImageInsertDialog from './ImageInsertDialog.svelte';
import type { MarkdownInsertPlacement } from './markdown-tools';
import type { ImageBlockDraft } from './image-insert-helpers';
import type { GalleryBlockDraft } from './gallery-insert-helpers';

type Props = {
  frontmatter: AdminContentEditorValues;
  collection: AdminContentWriteCollectionKey;
  dialogTitle: string;
  fieldsAriaLabel: string;
  frontmatterOpen: boolean;
  relativePath: string;
  issues: readonly AdminContentIssue[];
  disabled: boolean;
  frontmatterDirty: boolean;
  canSave: boolean;
  slugPlaceholder: string;
  imageInsertOpen: boolean;
  galleryInsertOpen: boolean;
  imageEditDraft?: ImageBlockDraft | null;
  galleryEditDraft?: GalleryBlockDraft | null;
  imageInsertEnabled: boolean;
  galleryInsertEnabled: boolean;
  imageUploadEndpoint: string;
  entryId: string;
  onFrontmatterClose: () => void;
  onFrontmatterReset: () => void;
  onFrontmatterSave: () => void | Promise<void>;
  onImageClose: () => void;
  onImageInsert: (text: string, placement?: MarkdownInsertPlacement) => void;
  onGalleryClose: () => void;
  onGalleryInsert: (text: string, placement?: MarkdownInsertPlacement) => void;
  onGalleryRemove?: () => void;
};

let {
  frontmatter = $bindable(),
  collection,
  dialogTitle,
  fieldsAriaLabel,
  frontmatterOpen,
  relativePath,
  issues,
  disabled,
  frontmatterDirty,
  canSave,
  slugPlaceholder,
  imageInsertOpen,
  galleryInsertOpen,
  imageEditDraft = null,
  galleryEditDraft = null,
  imageInsertEnabled,
  galleryInsertEnabled,
  imageUploadEndpoint,
  entryId,
  onFrontmatterClose,
  onFrontmatterReset,
  onFrontmatterSave,
  onImageClose,
  onImageInsert,
  onGalleryClose,
  onGalleryInsert,
  onGalleryRemove
}: Props = $props();

let articleInfoDialog = $state<ArticleInfoDialog | null>(null);

export const captureReturnFocus = (trigger?: Element | null) => {
  articleInfoDialog?.captureReturnFocus(trigger);
};
</script>

<ArticleInfoDialog
  bind:this={articleInfoDialog}
  bind:value={frontmatter}
  {collection}
  {dialogTitle}
  {fieldsAriaLabel}
  open={frontmatterOpen}
  {relativePath}
  {issues}
  {disabled}
  dirty={frontmatterDirty}
  {canSave}
  {slugPlaceholder}
  onClose={onFrontmatterClose}
  onReset={onFrontmatterReset}
  onSave={onFrontmatterSave}
/>

{#if imageInsertEnabled}
  <ImageInsertDialog
    open={imageInsertOpen}
    editDraft={imageEditDraft}
    uploadEndpoint={imageUploadEndpoint}
    {entryId}
    {disabled}
    onClose={onImageClose}
    onInsert={onImageInsert}
  />
{/if}

{#if galleryInsertEnabled}
  <GalleryInsertDialog
    open={galleryInsertOpen}
    editDraft={galleryEditDraft}
    uploadEndpoint={imageUploadEndpoint}
    {entryId}
    {disabled}
    onClose={onGalleryClose}
    onInsert={onGalleryInsert}
    onRemove={onGalleryRemove}
  />
{/if}
