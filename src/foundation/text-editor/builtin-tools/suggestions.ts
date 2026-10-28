/**
 * Built-in tools of the suggestions feature (Widgets `uwg-te-tab-tools-inserts`,
 * `uwg-te-req-surfaces-2`): the slash suggestion, whose items are the slash layout.
 */
import type { TextEditorTool } from '../tools.js';
import type { BuiltinToolIdOf } from './ids.js';
import { builtin, text } from './shared.js';

/** The built-in tools of the suggestions feature by identifier. */
export const textEditorSuggestionTools = Object.freeze({
  slash: builtin({
    id: 'slash',
    kind: 'suggestion',
    label: text('slash'),
    surfaces: [],
    suggest: { trigger: '/' },
    items: ({ layout }) => layout.slash,
  }),
} satisfies Readonly<Record<BuiltinToolIdOf<'suggestions'>, TextEditorTool>>);
