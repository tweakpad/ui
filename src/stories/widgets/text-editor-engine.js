import * as core from '@tiptap/core';
import * as state from '@tiptap/pm/state';
import * as history from '@tiptap/pm/history';
import * as starterKit from '@tiptap/starter-kit';
import * as list from '@tiptap/extension-list';
import * as table from '@tiptap/extension-table';
import * as tables from '@tiptap/pm/tables';
import { createTiptapEngine } from '../../foundation/text-editor/adapters/tiptap/index.js';

/** A new editing engine from the installed Tiptap modules; every editor needs its own. */
export function createEngine() {
  return createTiptapEngine({ core, state, history, starterKit, list, table, tables });
}
