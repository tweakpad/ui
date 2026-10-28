/**
 * The NodeState keys of the Lexical adapter (Widgets `uwg-te-req-content-1`,
 * `uwg-te-req-content-7`).
 *
 * Block identifiers and palette names live in NodeState, which the engine copies on clone and
 * serializes in native JSON under `$`; nothing is rendered as a `style`. The keys are fixed here
 * and recorded: `tp-id` on every block holder, `tp-color` and `tp-highlight` on text, and
 * `tp-background` on table cells. The configurations are created once per `lexical` namespace.
 */
import { isValidBlockId } from '../../ids.js';
import { isTextEditorColor, type TextEditorColor } from '../../palette.js';
import type { LexicalCoreLike, LexicalStateConfigLike } from './modules.js';

/** The NodeState keys, as native JSON holds them under `$`. */
export const LEXICAL_STATE_KEYS = Object.freeze({
  id: 'tp-id',
  color: 'tp-color',
  highlight: 'tp-highlight',
  background: 'tp-background',
});

/** The NodeState configurations of one `lexical` namespace. */
export interface LexicalStates {
  /** A block identifier, `''` when absent or invalid; reset when the engine copies a node. */
  readonly id: LexicalStateConfigLike<string>;
  /** The text color's hue, `''` for none. */
  readonly color: LexicalStateConfigLike<TextEditorColor | ''>;
  /** The highlight's hue, `''` for the default of a highlighted run. */
  readonly highlight: LexicalStateConfigLike<TextEditorColor | ''>;
  /** A table cell's background hue, `''` for none. */
  readonly background: LexicalStateConfigLike<TextEditorColor | ''>;
}

const parseId = (value: unknown): string =>
  typeof value === 'string' && isValidBlockId(value) ? value : '';
const parseColor = (value: unknown): TextEditorColor | '' =>
  isTextEditorColor(value) ? value : '';

const states = new WeakMap<LexicalCoreLike, LexicalStates>();

/** The NodeState configurations of a `lexical` namespace, created once per namespace. */
export function lexicalStates(lexical: LexicalCoreLike): LexicalStates {
  let found = states.get(lexical);
  if (!found) {
    found = Object.freeze({
      id: lexical.createState(LEXICAL_STATE_KEYS.id, { parse: parseId, resetOnCopyNode: true }),
      color: lexical.createState(LEXICAL_STATE_KEYS.color, { parse: parseColor }),
      highlight: lexical.createState(LEXICAL_STATE_KEYS.highlight, { parse: parseColor }),
      background: lexical.createState(LEXICAL_STATE_KEYS.background, { parse: parseColor }),
    });
    states.set(lexical, found);
  }
  return found;
}
