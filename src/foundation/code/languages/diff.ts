import type { Grammar, RawToken } from '../lexer.js';

/** Unified diff: one scope per line from its leading marker. */
export const diff: Grammar = (code) =>
  code.split(/(?<=\n)/).map((line): RawToken => {
    if (/^(?:diff |index |\+\+\+ |--- )/.test(line)) return { text: line, scope: 'comment' };
    if (line.startsWith('@@')) return { text: line, scope: 'keyword' };
    if (line.startsWith('+')) return { text: line, scope: 'inserted' };
    if (line.startsWith('-')) return { text: line, scope: 'deleted' };
    return { text: line };
  });
