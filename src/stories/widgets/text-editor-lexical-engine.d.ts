import type { TextEditorEngine } from '../../foundation/text-editor/index.js';

/** A new editing engine from the installed Lexical modules; every editor needs its own. */
export function createEngine(): TextEditorEngine;
