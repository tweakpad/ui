import type { TextEditorAction } from '../../foundation/text-editor/actions.js';
import type { TextEditorFocusPosition } from '../../foundation/text-editor/engine.js';

/**
 * Uploads one image file and resolves to its source (`uwg-te-tab-props` r13). The options have the
 * shape of File upload's uploader context, so the image popover passes that context through.
 */
export type TextEditorImageUpload = (
  file: File,
  options: { readonly signal: AbortSignal; onProgress(loaded: number, total?: number): void },
) => Promise<string>;

/** Options of `focus()` (`uwg-te-req-prop-2`): `position` `restore` (default), `start` or `end`. */
export interface TextEditorFocusOptions extends FocusOptions {
  readonly position?: TextEditorFocusPosition | undefined;
}

/** Detail of `tp-text-editor-ready` (`uwg-te-req-evt-5`). */
export interface TextEditorReadyDetail {
  readonly native: unknown;
}

/** Detail of `tp-text-editor-error` (`uwg-te-req-evt-5`). */
export interface TextEditorErrorDetail {
  readonly error: unknown;
}

/** `metadata` of `tp-value-change` (`uwg-te-req-evt-3`). */
export interface TextEditorChangeMetadata extends Record<string, unknown> {
  readonly origin: 'request' | 'engine';
  readonly tool: string | null;
  readonly actions: readonly TextEditorAction[];
}
