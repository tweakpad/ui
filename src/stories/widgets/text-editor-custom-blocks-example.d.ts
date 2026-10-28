import type { TextEditorBlockDefinition } from '../../foundation/text-editor/index.js';
import type { TpTextEditor } from '../../widgets/text-editor/index.js';

/** A callout textblock with a tone; its Markdown is an alert. */
export const calloutBlock: TextEditorBlockDefinition;
/** The https or same-origin URL an embed may load, or null. */
export function embedSource(src: unknown, base?: string): string | null;
/** An embed atom: a page in a sandboxed frame with a required title. */
export const embedBlock: TextEditorBlockDefinition;
/** The callout and the embed in the slash menu and the block gutter. */
export function setupCustomBlocks(editor: TpTextEditor): void;
