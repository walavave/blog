<script lang="ts">
import type {
  EditorViewMode,
  StatusState
} from './editor-shell-helpers';
import type {
  MarkdownCalloutType,
  MarkdownHeadingLevel,
  MarkdownInsertPlacement,
  MarkdownToolId
} from './markdown-tools';
import type { MarkdownHighlightTheme } from './editor-markdown-highlight';
import EditorActionMenu from './EditorActionMenu.svelte';
import EditorToolbar from './EditorToolbar.svelte';

type Props = {
  actionMenuElement: HTMLDivElement | null;
  busy: boolean;
  bodyToolsEnabled?: boolean;
  outlineOpen: boolean;
  outlineVisible: boolean;
  outlineToggleLabel: string;
  outlineControlDisabled: boolean;
  outlinePanelId: string;
  syntaxOpen: boolean;
  syntaxVisible: boolean;
  syntaxToggleLabel: string;
  syntaxControlDisabled: boolean;
  syntaxPanelId: string;
  lineNumbersEnabled: boolean;
  lineNumbersToggleLabel: string;
  markdownHighlightTheme: MarkdownHighlightTheme;
  editorLayoutIsSplit: boolean;
  editorLayoutToggleLabel: string;
  editorLayoutToggleIcon: 'columns-2' | 'rows-2' | 'undo-2';
  singleViewActive: boolean;
  singleViewReturnLabel: string;
  splitBothIsCompact: boolean;
  compactPaneToggleLabel: string;
  compactPaneToggleText: string;
  editViewToggleLabel: string;
  previewViewToggleLabel: string;
  effectiveViewMode: EditorViewMode;
  statusText: string;
  statusState: StatusState;
  canWriteContent: boolean;
  dirty: boolean;
  returnHref: string;
  exportHref: string;
  onApplyTool: (toolId: MarkdownToolId) => void;
  onApplyHeading: (level: MarkdownHeadingLevel) => void;
  onApplyCallout: (calloutType: MarkdownCalloutType) => void;
  onInsertText: (text: string, placement?: MarkdownInsertPlacement) => void;
  onOpenGallery: () => void;
  onToggleOutline: () => void;
  onToggleSyntax: () => void;
  onToggleLineNumbers: () => void;
  onSelectMarkdownHighlightTheme: (theme: MarkdownHighlightTheme) => void;
  onToggleLayout: () => void;
  onToggleView: (viewMode: Exclude<EditorViewMode, 'both'>) => void;
  onReturnToBothView: () => void;
  onToggleCompactPane: () => void;
  onSave: () => void | Promise<void>;
  onReset: (event: MouseEvent) => void;
  onDownload: (event: MouseEvent) => void;
  onDelete: (event: MouseEvent) => void | Promise<void>;
};

let {
  actionMenuElement = $bindable(null),
  busy,
  bodyToolsEnabled = true,
  outlineOpen,
  outlineVisible,
  outlineToggleLabel,
  outlineControlDisabled,
  outlinePanelId,
  syntaxOpen,
  syntaxVisible,
  syntaxToggleLabel,
  syntaxControlDisabled,
  syntaxPanelId,
  lineNumbersEnabled,
  lineNumbersToggleLabel,
  markdownHighlightTheme,
  editorLayoutIsSplit,
  editorLayoutToggleLabel,
  editorLayoutToggleIcon,
  singleViewActive,
  singleViewReturnLabel,
  splitBothIsCompact,
  compactPaneToggleLabel,
  compactPaneToggleText,
  editViewToggleLabel,
  previewViewToggleLabel,
  effectiveViewMode,
  statusText,
  statusState,
  canWriteContent,
  dirty,
  returnHref,
  exportHref,
  onApplyTool,
  onApplyHeading,
  onApplyCallout,
  onInsertText,
  onOpenGallery,
  onToggleOutline,
  onToggleSyntax,
  onToggleLineNumbers,
  onSelectMarkdownHighlightTheme,
  onToggleLayout,
  onToggleView,
  onReturnToBothView,
  onToggleCompactPane,
  onSave,
  onReset,
  onDownload,
  onDelete
}: Props = $props();
</script>

{#if bodyToolsEnabled}
  <EditorToolbar
    {busy}
    {outlineOpen}
    {outlineVisible}
    {outlineToggleLabel}
    {outlineControlDisabled}
    {outlinePanelId}
    {syntaxOpen}
    {syntaxVisible}
    {syntaxToggleLabel}
    {syntaxControlDisabled}
    {syntaxPanelId}
    {lineNumbersEnabled}
    {lineNumbersToggleLabel}
    {markdownHighlightTheme}
    {editorLayoutIsSplit}
    {editorLayoutToggleLabel}
    {editorLayoutToggleIcon}
    {singleViewActive}
    {singleViewReturnLabel}
    {splitBothIsCompact}
    {compactPaneToggleLabel}
    {compactPaneToggleText}
    {editViewToggleLabel}
    {previewViewToggleLabel}
    {effectiveViewMode}
    {onApplyTool}
    {onApplyHeading}
    {onApplyCallout}
    {onInsertText}
    {onOpenGallery}
    {onToggleOutline}
    {onToggleSyntax}
    {onToggleLineNumbers}
    {onSelectMarkdownHighlightTheme}
    {onToggleLayout}
    {onToggleView}
    {onReturnToBothView}
    {onToggleCompactPane}
  />
{/if}

<EditorActionMenu
  bind:element={actionMenuElement}
  {statusText}
  {statusState}
  {canWriteContent}
  {busy}
  {dirty}
  {returnHref}
  {exportHref}
  {onSave}
  {onReset}
  {onDownload}
  {onDelete}
/>
