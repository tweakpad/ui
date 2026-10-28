/**
 * The complete set of built-in tools (Widgets `uwg-te-par-tools-1`, `uwg-te-tab-tools`,
 * `uwg-te-tab-tools-blocks`, `uwg-te-tab-tools-inserts`, `uwg-te-tab-tools-actions`,
 * `uwg-te-tab-tools-tables`).
 *
 * One frozen record of every built-in tool by identifier, in the order of the five tables, merged
 * from the core set and the set of each feature. Applications read identifiers, labels and
 * shortcuts from it; the widget holds the core set and the set of each feature it includes, so
 * that a page bundles only the tools, and the icons, of the features it imports.
 */
import type { TextEditorTool } from '../tools.js';
import { textEditorBlockTools } from './blocks.js';
import { textEditorCoreTools } from './core.js';
import { BUILTIN_TOOL_FEATURES, type TextEditorBuiltinToolId } from './ids.js';
import { textEditorImageTools } from './images.js';
import { textEditorLinkTools } from './links.js';
import { textEditorSuggestionTools } from './suggestions.js';
import { textEditorTableTools } from './tables.js';

const sets: Readonly<Record<string, TextEditorTool>> = {
  ...textEditorCoreTools,
  ...textEditorLinkTools,
  ...textEditorTableTools,
  ...textEditorImageTools,
  ...textEditorSuggestionTools,
  ...textEditorBlockTools,
};

function merged(): Readonly<Record<TextEditorBuiltinToolId, TextEditorTool>> {
  const tools: Record<string, TextEditorTool> = {};
  for (const id of Object.keys(BUILTIN_TOOL_FEATURES)) {
    const tool = sets[id];
    if (!tool) throw new Error(`The built-in tool "${id}" has no definition.`);
    tools[id] = tool;
  }
  return Object.freeze(tools) as Readonly<Record<TextEditorBuiltinToolId, TextEditorTool>>;
}

/** The built-in tools by identifier. */
export const textEditorTools = merged();

export type { TextEditorBuiltinToolId, TextEditorToolFeature } from './ids.js';
