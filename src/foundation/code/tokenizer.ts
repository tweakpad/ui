import { toLines, type Grammar } from './lexer.js';
import { bash } from './languages/bash.js';
import { css } from './languages/css.js';
import { diff } from './languages/diff.js';
import { html } from './languages/html.js';
import { json } from './languages/json.js';
import { tsx, typescript } from './languages/typescript.js';
import { plainTokens, splitLines, type CodeTokens } from './types.js';

/** Built-in grammars by language name and alias (lower case). */
const GRAMMARS: Readonly<Record<string, Grammar>> = {
  typescript,
  ts: typescript,
  javascript: typescript,
  js: typescript,
  mjs: typescript,
  cjs: typescript,
  jsx: tsx,
  tsx,
  html,
  xml: html,
  svg: html,
  css,
  json,
  jsonc: json,
  bash,
  sh: bash,
  shell: bash,
  zsh: bash,
  console: bash,
  diff,
};
const PLAIN = ['plaintext', 'text', 'txt'];

/** Every language name and alias the built-in tokenizer accepts. */
export const BUILTIN_LANGUAGES: readonly string[] = [...Object.keys(GRAMMARS), ...PLAIN];

/**
 * Tokenizes with a built-in grammar. Unknown languages fall back to plain text with
 * `language: 'plaintext'`; concatenating each line's tokens always reproduces that input line.
 */
export function tokenize(code: string, language: string): CodeTokens {
  const normalized = code.replace(/\r\n?/g, '\n');
  const name = language.trim().toLowerCase();
  const grammar = Object.hasOwn(GRAMMARS, name) ? GRAMMARS[name] : undefined;
  if (!grammar) return plainTokens(normalized, PLAIN.includes(name) ? name : 'plaintext');
  const lines = toLines(grammar(normalized));
  // An empty input still reports the single empty line splitLines does.
  while (lines.length < splitLines(normalized).length) lines.push([]);
  return { language: name, lines };
}
