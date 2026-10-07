import { lex, type Grammar, type LexRule, type RawToken } from '../lexer.js';
import { css } from './css.js';
import { typescript } from './typescript.js';

/** `<name attr="value" …>` or `</name>`, with `<script>`/`<style>` bodies in their language. */
function tag(code: string, offset: number): RawToken[] | null {
  const open = /<(\/?)([A-Za-z][\w:.-]*)/y;
  open.lastIndex = offset;
  const found = open.exec(code);
  if (!found) return null;
  const closing = found[1] === '/';
  const name = found[2]!;
  const tokens: RawToken[] = [
    { text: `<${found[1]}`, scope: 'punctuation' },
    { text: name, scope: 'tag' },
  ];
  let index = open.lastIndex;
  const attribute = /(\s+)|([^\s"'>/=]+)|(=)|("[^"]*"?|'[^']*'?)|(\/?>)|(\/)/y;
  let ended = false;
  let selfClosing = false;
  while (index < code.length) {
    attribute.lastIndex = index;
    const part = attribute.exec(code);
    if (!part) break;
    const [text, space, attr, equals, value, end] = part;
    if (space) tokens.push({ text });
    else if (attr) {
      const unquotedValue = before(tokens) === '=';
      tokens.push({ text, scope: unquotedValue ? 'string' : 'attribute' });
    } else if (equals) tokens.push({ text, scope: 'punctuation' });
    else if (value) tokens.push({ text, scope: 'string' });
    else if (end) {
      tokens.push({ text, scope: 'punctuation' });
      ended = true;
      selfClosing = text === '/>';
    } else tokens.push({ text, scope: 'punctuation' });
    index = attribute.lastIndex;
    if (ended) break;
  }
  const lower = name.toLowerCase();
  if (ended && !closing && !selfClosing && (lower === 'script' || lower === 'style')) {
    const close = code.toLowerCase().indexOf(`</${lower}`, index);
    const body = code.slice(index, close < 0 ? code.length : close);
    if (body) tokens.push(...(lower === 'style' ? css(body) : typescript(body)));
  }
  return tokens;
}

/** The text of the last significant (non-space) token. */
function before(tokens: readonly RawToken[]): string {
  for (let index = tokens.length - 1; index >= 0; index--)
    if (tokens[index]!.text.trim()) return tokens[index]!.text;
  return '';
}

const rules: LexRule[] = [
  { scope: 'comment', pattern: /<!--[\s\S]*?(?:-->|$)/y },
  { scope: 'keyword', pattern: /<!DOCTYPE[^>]*>?/iy },
  { match: tag },
  { scope: 'constant', pattern: /&(?:#\d+|#x[\da-fA-F]+|\w+);/y },
  { pattern: /[^<&]+/y },
];

export const html: Grammar = (code) => lex(code, rules);
