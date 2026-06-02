<script lang="ts">
import type {
  AdminContentIssue,
  AdminContentWriteResult
} from './content-editor-client';
import type {
  EditorSidePanelLayout,
  EditorViewMode
} from './editor-shell-helpers';
import type {
  EditorOutlineEssayListItem,
  EditorOutlineTab,
  MarkdownOutlineJumpCommand,
  MarkdownOutlineItem
} from './editor-outline-helpers';
import type {
  MarkdownToolbarCommand,
  MarkdownToolId
} from './markdown-tools';
import type { EditableImageBlock } from './editor-image-blocks';
import type { EditableGalleryBlock } from './editor-gallery-blocks';
import type { MarkdownHighlightTheme } from './editor-markdown-highlight';
import BodyEditor from './BodyEditor.svelte';
import EditorSidePanels from './EditorSidePanels.svelte';
import PreviewPane from './PreviewPane.svelte';
import PreviewStatusBar from './PreviewStatusBar.svelte';

type Props = {
  value: string;
  disabled?: boolean;
  toolbarCommand?: MarkdownToolbarCommand | null;
  outlineJumpCommand?: MarkdownOutlineJumpCommand | null;
  lineNumbersEnabled?: boolean;
  markdownHighlightTheme: MarkdownHighlightTheme;
  effectiveViewMode: EditorViewMode;
  bodyLineCount: number;
  bodyCharCount: number;
  errors: readonly string[];
  issues: readonly AdminContentIssue[];
  previewError: string;
  previewWarnings: readonly string[];
  writeResult: AdminContentWriteResult | null;
  syncScrollEnabled: boolean;
  scrollSyncToggleLabel: string;
  scrollSyncControlDisabled: boolean;
  scrollTopControlDisabled: boolean;
  getWriteFieldLabel: (field: string) => string;
  previewHtml: string;
  previewBusy: boolean;
  sidePanelsVisible: boolean;
  sidePanelLayout: EditorSidePanelLayout;
  outlinePanelId: string;
  syntaxPanelId: string;
  outlineActiveTab: EditorOutlineTab;
  markdownOutlineItems: readonly MarkdownOutlineItem[];
  essayOutlineListItems: readonly EditorOutlineEssayListItem[];
  onBodyScrollElementChange: (element: HTMLElement | null) => void;
  onBodyOutlineJump: (element: HTMLElement) => void;
  onImageToolRequest: (block: EditableImageBlock | null) => void;
  onGalleryEditRequest: (block: EditableGalleryBlock) => void;
  onPreviewScrollElementChange: (element: HTMLElement | null) => void;
  onShortcutTool: (toolId: MarkdownToolId) => void;
  onToggleScrollSync: () => void;
  onScrollToTop: () => void;
  onOutlineTabChange: (tab: EditorOutlineTab) => void;
  onOutlineHeadingSelect: (item: MarkdownOutlineItem) => void;
  onSyntaxMaximizeToggle: () => void;
};

let {
  value = $bindable(''),
  disabled = false,
  toolbarCommand = null,
  outlineJumpCommand = null,
  lineNumbersEnabled = false,
  markdownHighlightTheme,
  effectiveViewMode,
  bodyLineCount,
  bodyCharCount,
  errors,
  issues,
  previewError,
  previewWarnings,
  writeResult,
  syncScrollEnabled,
  scrollSyncToggleLabel,
  scrollSyncControlDisabled,
  scrollTopControlDisabled,
  getWriteFieldLabel,
  previewHtml,
  previewBusy,
  sidePanelsVisible,
  sidePanelLayout,
  outlinePanelId,
  syntaxPanelId,
  outlineActiveTab,
  markdownOutlineItems,
  essayOutlineListItems,
  onBodyScrollElementChange,
  onBodyOutlineJump,
  onImageToolRequest,
  onGalleryEditRequest,
  onPreviewScrollElementChange,
  onShortcutTool,
  onToggleScrollSync,
  onScrollToTop,
  onOutlineTabChange,
  onOutlineHeadingSelect,
  onSyntaxMaximizeToggle
}: Props = $props();
</script>

<div class="admin-editor-shell__layout">
  <div class="admin-editor-shell__workspace">
    <div
      class="admin-editor-shell__pane admin-editor-shell__pane--body"
      data-markdown-highlight-theme={markdownHighlightTheme}
      data-line-numbers={lineNumbersEnabled ? 'true' : undefined}
      hidden={effectiveViewMode === 'preview'}
    >
      <BodyEditor
        bind:value
        {disabled}
        {toolbarCommand}
        {outlineJumpCommand}
        {lineNumbersEnabled}
        onScrollElementChange={onBodyScrollElementChange}
        onOutlineJump={onBodyOutlineJump}
        {onImageToolRequest}
        {onGalleryEditRequest}
        onShortcutTool={onShortcutTool}
      />
    </div>
    <PreviewStatusBar
      {bodyLineCount}
      {bodyCharCount}
      {errors}
      {issues}
      {previewError}
      {previewWarnings}
      {writeResult}
      {syncScrollEnabled}
      {scrollSyncToggleLabel}
      {scrollSyncControlDisabled}
      {scrollTopControlDisabled}
      {getWriteFieldLabel}
      onToggleScrollSync={onToggleScrollSync}
      onScrollToTop={onScrollToTop}
    />
    <div class="admin-editor-shell__pane admin-editor-shell__pane--preview" hidden={effectiveViewMode === 'edit'}>
      <PreviewPane
        html={previewHtml}
        loading={previewBusy}
        error={previewError}
        onScrollElementChange={onPreviewScrollElementChange}
      />
    </div>
  </div>
  {#if sidePanelsVisible}
    <EditorSidePanels
      layout={sidePanelLayout}
      {outlinePanelId}
      {syntaxPanelId}
      activeTab={outlineActiveTab}
      headings={markdownOutlineItems}
      essays={essayOutlineListItems}
      onTabChange={onOutlineTabChange}
      onHeadingSelect={onOutlineHeadingSelect}
      onSyntaxMaximizeToggle={onSyntaxMaximizeToggle}
    />
  {/if}
</div>
