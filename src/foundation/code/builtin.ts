import { BUILTIN_LANGUAGES, tokenize } from './tokenizer.js';
import type { CodeHighlighter } from './types.js';

/**
 * The default highlighter: synchronous, dependency-free grammars for TypeScript/JavaScript
 * (JSX/TSX, lit templates), HTML, CSS, JSON, shell and diff. Unknown languages are plain text.
 */
export const builtinHighlighter: CodeHighlighter = {
  name: 'builtin',
  languages: BUILTIN_LANGUAGES,
  highlight: (code, language) => tokenize(code, language),
};
