import type {
  AdminBitsEditorValues,
  AdminEssayEditorValues
} from '../../../lib/admin-console/content-shared';
import type { EditorOutlineEssaySourceItem } from './editor-outline-helpers';

type BaseEditorShellProps = {
  endpoint: string;
  exportEndpoint: string;
  deleteEndpoint: string;
  previewEndpoint: string;
  imageUploadEndpoint: string;
  returnHref: string;
  entryId: string;
  relativePath: string;
  defaultPublicSlug: string;
  revision: string;
  initialArticleInfoOpen?: boolean;
};

export type EssayEditorShellProps = BaseEditorShellProps & {
  collection: 'essay';
  initialFrontmatter: AdminEssayEditorValues;
  initialBody: string;
  essayOutlineItems?: EditorOutlineEssaySourceItem[];
};

export type BitsEditorShellProps = BaseEditorShellProps & {
  collection: 'bits';
  initialFrontmatter: AdminBitsEditorValues;
  initialBody?: string;
  essayOutlineItems?: never;
};

export type EditorShellProps = EssayEditorShellProps | BitsEditorShellProps;
