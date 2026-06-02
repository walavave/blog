export {
  deleteContentEntry as deleteEssayEntry,
  renderContentPreview as renderEssayPreview,
  saveContentEntry as saveEssayEntry
} from './content-editor-client';

export type {
  AdminContentDeleteResult,
  AdminContentIssue,
  AdminContentPreviewResult,
  AdminContentWriteResult,
  ContentEditorDeleteInput as EssayEditorDeleteInput,
  ContentEditorDeleteOutcome as EssayEditorDeleteOutcome,
  ContentEditorPreviewInput as EssayEditorPreviewInput,
  ContentEditorPreviewOutcome as EssayEditorPreviewOutcome,
  ContentEditorSaveInput as EssayEditorSaveInput,
  ContentEditorSaveOutcome as EssayEditorSaveOutcome
} from './content-editor-client';
