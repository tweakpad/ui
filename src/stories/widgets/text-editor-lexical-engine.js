import * as lexical from 'lexical';
import * as extension from '@lexical/extension';
import * as richText from '@lexical/rich-text';
import * as history from '@lexical/history';
import * as selection from '@lexical/selection';
import * as list from '@lexical/list';
import * as link from '@lexical/link';
import * as markdown from '@lexical/markdown';
import * as code from '@lexical/code';
import * as a11y from '@lexical/a11y';
import * as html from '@lexical/html';
import * as table from '@lexical/table';
import { createLexicalEngine } from '../../foundation/text-editor/adapters/lexical/index.js';

/** A new editing engine from the installed Lexical modules; every editor needs its own. */
export function createEngine() {
  return createLexicalEngine({
    lexical,
    extension,
    richText,
    history,
    selection,
    list,
    link,
    markdown,
    code,
    a11y,
    html,
    table,
  });
}
