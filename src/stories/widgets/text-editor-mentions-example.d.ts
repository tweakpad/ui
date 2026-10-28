import type { TextEditorInlineDefinition } from '../../foundation/text-editor/index.js';
import type { TpTextEditor } from '../../widgets/text-editor/index.js';

/** A mention inline atom that `@` inserts from a list of the crew. */
export const mentionInline: TextEditorInlineDefinition;
/** The mention list on `@`, beside the slash menu. */
export function setupMentions(editor: TpTextEditor): void;
