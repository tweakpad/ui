import { lex, type Grammar, type LexRule, type RawToken } from '../lexer.js';
import { css } from './css.js';
import { html } from './html.js';

const KEYWORDS = new Set(
  (
    'abstract accessor as async await break case catch class const continue debugger declare ' +
    'default delete do else enum export extends finally for from function get if implements ' +
    'import in infer instanceof interface is keyof let module namespace new of override private ' +
    'protected public readonly return satisfies set static super switch this throw try type ' +
    'typeof var void while with yield'
  ).split(' '),
);
const CONSTANTS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);
const TYPES = new Set('any bigint boolean never number object string symbol unknown'.split(' '));

/** The previous non-space character before `offset`. */
function before(code: string, offset: number): string {
  for (let index = offset - 1; index >= 0; index--)
    if (!/\s/.test(code[index]!)) return code[index]!;
  return '';
}

function identifier(code: string, offset: number): RawToken[] | null {
  const match = /[A-Za-z_$][\w$]*/y;
  match.lastIndex = offset;
  const word = match.exec(code)?.[0];
  if (!word) return null;
  const next = code.slice(offset + word.length).match(/^\s*(\S)/)?.[1];
  // `.member`, but not a spread `...rest`.
  let previous = offset - 1;
  while (previous >= 0 && /\s/.test(code[previous]!)) previous--;
  const afterDot = code[previous] === '.' && code[previous - 1] !== '.';
  let scope: RawToken['scope'];
  if (afterDot) scope = next === '(' ? 'function' : 'property';
  else if (CONSTANTS.has(word)) scope = 'constant';
  else if (KEYWORDS.has(word)) scope = 'keyword';
  else if (TYPES.has(word) || /^[A-Z]/.test(word)) scope = 'type';
  else if (next === '(') scope = 'function';
  return [{ text: word, scope }];
}

/** Ends of a `${…}` expression starting at `offset` (just after `${`), balancing braces. */
function expressionEnd(code: string, offset: number): number {
  let depth = 1;
  for (let index = offset; index < code.length; index++) {
    const char = code[index];
    if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return index;
  }
  return code.length;
}

/** Template literal; lit `html`/`svg`/`css` tags tokenize their static parts as that language. */
function template(this: { jsx: boolean }, code: string, offset: number): RawToken[] | null {
  if (code[offset] !== '`') return null;
  const tag = /\b(html|svg|css)\s*$/.exec(code.slice(Math.max(0, offset - 8), offset))?.[1];
  const embedded: Grammar | null = tag === 'css' ? css : tag ? html : null;
  const tokens: RawToken[] = [{ text: '`', scope: 'string' }];
  let index = offset + 1;
  let chunk = '';
  const flush = () => {
    if (!chunk) return;
    tokens.push(...(embedded ? embedded(chunk) : [{ text: chunk, scope: 'string' as const }]));
    chunk = '';
  };
  while (index < code.length) {
    const char = code[index]!;
    if (char === '\\') {
      chunk += code.slice(index, index + 2);
      index += 2;
    } else if (char === '`') {
      flush();
      tokens.push({ text: '`', scope: 'string' });
      return tokens;
    } else if (char === '$' && code[index + 1] === '{') {
      flush();
      const end = expressionEnd(code, index + 2);
      tokens.push({ text: '${', scope: 'punctuation' });
      tokens.push(...grammar(this.jsx)(code.slice(index + 2, end)));
      if (end < code.length) tokens.push({ text: '}', scope: 'punctuation' });
      index = end + 1;
    } else {
      chunk += char;
      index++;
    }
  }
  flush();
  return tokens;
}

/** `<Tag` / `</Tag` / `>` in JSX; generics such as `Array<T>` stay operators/types. */
function jsxTag(code: string, offset: number): RawToken[] | null {
  const match = /<(\/?)([A-Za-z][\w.:-]*)/y;
  match.lastIndex = offset;
  const found = match.exec(code);
  if (!found) return null;
  const previous = before(code, offset);
  // `a < b`, `Array<T>`: a tag only follows an operator, bracket, return-like keyword or start.
  if (
    previous &&
    !/[=(,:?&|{};>[\]!]/.test(previous) &&
    !/\breturn\s*$/.test(code.slice(0, offset))
  )
    return null;
  return [
    { text: `<${found[1]}`, scope: 'punctuation' },
    { text: found[2]!, scope: /^[A-Z]/.test(found[2]!) ? 'type' : 'tag' },
  ];
}

const cache = new Map<boolean, Grammar>();

function grammar(jsx: boolean): Grammar {
  const existing = cache.get(jsx);
  if (existing) return existing;
  const context = { jsx };
  const rules: LexRule[] = [
    { pattern: /\s+/y },
    { scope: 'comment', pattern: /\/\/[^\n]*/y },
    { scope: 'comment', pattern: /\/\*[\s\S]*?(?:\*\/|$)/y },
    { match: template.bind(context) },
    { scope: 'string', pattern: /'(?:\\.|[^'\\\n])*'?/y },
    { scope: 'string', pattern: /"(?:\\.|[^"\\\n])*"?/y },
    ...(jsx ? [{ match: jsxTag }] : []),
    { scope: 'function', pattern: /@[A-Za-z_$][\w$]*/y },
    {
      scope: 'number',
      pattern:
        /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.\d[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?)/y,
    },
    { match: identifier },
    { scope: 'operator', pattern: /=>|\.\.\.|[+\-*/%=!<>&|^~?:]+/y },
    { scope: 'punctuation', pattern: /[{}()[\];,.]/y },
  ];
  const result: Grammar = (code) => lex(code, rules);
  cache.set(jsx, result);
  return result;
}

export const typescript: Grammar = (code) => grammar(false)(code);
export const tsx: Grammar = (code) => grammar(true)(code);
